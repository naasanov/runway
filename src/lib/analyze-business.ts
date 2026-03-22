import { notFound, serverError } from "@/lib/errors";
import {
  inferDemoCategorizationBatch,
  isGeminiServiceUnavailable,
} from "@/lib/demo-fallback";
import { computeForecast } from "@/lib/forecast";
import { gemini } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";
import type {
  Alert,
  AnalyzeCompletedEvent,
  AnalyzeResponse,
  AnalyzeStreamEvent,
  AnalyzeStreamTransaction,
  Category,
  RecurrencePattern,
  Transaction,
} from "@/lib/types";
import { CATEGORIES, RECURRENCE_PATTERNS } from "@/lib/types";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a financial transaction categorizer for small businesses.

For each transaction, return a JSON object with:
- "id": the transaction id (pass through exactly)
- "category": one of ${JSON.stringify([...CATEGORIES])}
- "is_recurring": boolean
- "recurrence_pattern": one of ${JSON.stringify([...RECURRENCE_PATTERNS])} or null

Rules:
- Classify based on the description, amount, and tags.
- Negative amounts are expenses (debits). Positive amounts are income (credits).
- Invoices (transaction_type "invoice") are always "revenue" regardless of amount sign.
- Subscription services are "subscriptions".
- Payroll/salary payments are "payroll".
- Rent/lease payments are "rent".
- Insurance premiums are "insurance".
- Ingredient/material purchases are "supplies".
- If a transaction repeats at a regular interval, mark is_recurring true and set recurrence_pattern.
- If unsure about recurrence, set is_recurring false and recurrence_pattern null.
- If unsure about category, use "unknown".

Respond with ONLY a JSON array of objects. No markdown, no explanation.`;

export const ANALYZE_BATCH_SIZE = 50;
export const ANALYZE_GEMINI_CONCURRENCY = 2;

interface GeminiCategorizationResult {
  id: string;
  category: string;
  is_recurring: boolean;
  recurrence_pattern: string | null;
}

interface BatchOutcome {
  batchNumber: number;
  batchSize: number;
  categorizedRows: Transaction[];
}

export class AnalyzePipelineError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AnalyzePipelineError";
  }
}

function logAnalyze(
  businessId: string,
  stage: string,
  details?: Record<string, unknown>,
) {
  const suffix = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[analyze:${businessId}] ${stage}${suffix}`);
}

async function emitProgress(
  onProgress: AnalyzeProgressCallback | undefined,
  event: AnalyzeStreamEvent,
) {
  await onProgress?.(event);
}

function toAnalyzeStreamTransaction(
  transaction: Transaction,
): AnalyzeStreamTransaction {
  return {
    id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    amount: transaction.amount,
    source: transaction.source,
    invoice_status: transaction.invoice_status,
    category: transaction.category ?? "unknown",
    is_recurring: transaction.is_recurring,
    recurrence_pattern: transaction.recurrence_pattern,
  };
}

function normalizeCategorizedTransaction(
  transactionById: Map<string, Transaction>,
  result: GeminiCategorizationResult,
): Transaction {
  const existingTransaction = transactionById.get(result.id);

  if (!existingTransaction) {
    throw new AnalyzePipelineError(
      "DB_UPDATE_FAILED",
      `Missing transaction for result ${result.id}.`,
    );
  }

  const category = CATEGORIES.includes(result.category as Category)
    ? (result.category as Category)
    : "unknown";

  const recurrencePattern =
    result.is_recurring &&
    result.recurrence_pattern &&
    RECURRENCE_PATTERNS.includes(result.recurrence_pattern as RecurrencePattern)
      ? (result.recurrence_pattern as RecurrencePattern)
      : null;

  return {
    ...existingTransaction,
    category,
    is_recurring: result.is_recurring ?? false,
    recurrence_pattern: recurrencePattern,
  };
}

async function recomputeRunway(businessId: string): Promise<{
  runway_days: number;
  runway_severity: "red" | "amber" | "green";
}> {
  const [
    { data: business, error: businessError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, current_balance")
      .eq("id", businessId)
      .single(),
    supabase.from("transactions").select("*").eq("business_id", businessId),
  ]);

  if (businessError || !business || transactionsError) {
    throw new AnalyzePipelineError(
      "RUNWAY_RECOMPUTE_FAILED",
      "Failed to recompute runway.",
    );
  }

  const forecast = computeForecast(
    (transactions ?? []) as Transaction[],
    business.current_balance,
    30,
  );

  const { error: updateError } = await supabase
    .from("businesses")
    .update({
      runway_days: forecast.runwayDays,
      runway_severity: forecast.runwaySeverity,
    })
    .eq("id", businessId);

  if (updateError) {
    throw new AnalyzePipelineError(
      "RUNWAY_RECOMPUTE_FAILED",
      "Failed to recompute runway.",
    );
  }

  return {
    runway_days: forecast.runwayDays,
    runway_severity: forecast.runwaySeverity,
  };
}

type AnalyzeProgressCallback = (
  event: AnalyzeStreamEvent,
) => void | Promise<void>;

async function processBatch(
  businessId: string,
  batchNumber: number,
  batch: Transaction[],
  transactionById: Map<string, Transaction>,
  onProgress?: AnalyzeProgressCallback,
): Promise<BatchOutcome> {
  const stripped = batch.map((transaction) => ({
    id: transaction.id,
    amount: transaction.amount,
    description: transaction.description,
    transaction_type: transaction.transaction_type,
    tags: transaction.tags,
    date: transaction.date,
  }));

  logAnalyze(businessId, "gemini_batch_start", {
    batch: batchNumber,
    batch_size: stripped.length,
  });
  await emitProgress(onProgress, {
    type: "batch_started",
    business_id: businessId,
    batch_number: batchNumber,
    batch_size: stripped.length,
    transactions: batch.map((transaction) => ({
      ...toAnalyzeStreamTransaction(transaction),
      category: null,
      is_recurring: false,
      recurrence_pattern: null,
    })),
  });

  let parsed: GeminiCategorizationResult[];

  try {
    const response = await gemini.generateContent([
      SYSTEM_PROMPT,
      `Categorize these ${stripped.length} transactions:\n${JSON.stringify(stripped)}`,
    ]);

    const text = response.response.text();
    const cleaned = text
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .trim();
    parsed = JSON.parse(cleaned) as GeminiCategorizationResult[];

    logAnalyze(businessId, "gemini_batch_done", {
      batch: batchNumber,
      parsed_count: parsed.length,
    });
  } catch (error) {
    if (!isGeminiServiceUnavailable(error)) {
      throw new AnalyzePipelineError(
        "ANALYZE_FAILED",
        "AI categorization failed. Please try again.",
      );
    }

    const fallback = inferDemoCategorizationBatch(batch);
    logAnalyze(businessId, "gemini_batch_fallback", {
      batch: batchNumber,
      fallback_count: fallback.length,
    });
    await emitProgress(onProgress, {
      type: "fallback_used",
      business_id: businessId,
      batch_number: batchNumber,
      fallback_count: fallback.length,
    });
    parsed = fallback;
  }

  const categorizedRows = parsed.map((result) =>
    normalizeCategorizedTransaction(transactionById, result),
  );

  const { data: writtenRows, error: upsertErr } = await supabase
    .from("transactions")
    .upsert(categorizedRows, { onConflict: "id" })
    .select("id");

  if (upsertErr) {
    logAnalyze(businessId, "categorization_write_failed", {
      row_count: categorizedRows.length,
      batch: batchNumber,
    });
    console.error("Failed to bulk update categorizations:", upsertErr);
    throw new AnalyzePipelineError(
      "DB_UPDATE_FAILED",
      "Failed to write categorized transactions.",
    );
  }

  const processedCount = writtenRows?.length ?? categorizedRows.length;
  logAnalyze(businessId, "batch_categorizations_written", {
    batch: batchNumber,
    processed_count: processedCount,
  });

  await emitProgress(onProgress, {
    type: "batch_completed",
    business_id: businessId,
    batch_number: batchNumber,
    processed_count: processedCount,
    transactions: categorizedRows.map(toAnalyzeStreamTransaction),
  });

  return {
    batchNumber,
    batchSize: processedCount,
    categorizedRows,
  };
}

async function runPostProcessing(
  businessId: string,
  categorized: number,
  startedAt: number,
): Promise<AnalyzeResponse> {
  logAnalyze(businessId, "recomputing_runway_with_alerts");
  const runway = await recomputeRunway(businessId);
  logAnalyze(businessId, "runway_recomputed", {
    runway_days: runway.runway_days,
    runway_severity: runway.runway_severity,
  });

  const {
    detectRunwayAlert,
    detectOverdueInvoiceAlerts,
    detectSubscriptionWasteAlerts,
    writeAlertToDb,
    clearExistingAlerts,
  } = await import("@/lib/alert-scenarios");

  logAnalyze(businessId, "clearing_existing_alerts");
  await clearExistingAlerts(supabase, businessId);

  logAnalyze(businessId, "loading_business_and_transactions_for_alerts");
  const { data: currentBiz } = await supabase
    .from("businesses")
    .select("id, current_balance, runway_days, runway_severity")
    .eq("id", businessId)
    .single();

  const { data: allTxns } = await supabase
    .from("transactions")
    .select("*")
    .eq("business_id", businessId);

  const allTransactions = (allTxns ?? []) as Transaction[];
  logAnalyze(businessId, "alert_inputs_loaded", {
    transaction_count: allTransactions.length,
  });

  const forecast = computeForecast(
    allTransactions,
    currentBiz?.current_balance ?? 0,
    30,
  );
  logAnalyze(businessId, "alert_forecast_computed", {
    danger_dates: forecast.dangerDates.length,
    upcoming_obligations: forecast.upcomingObligations.length,
  });

  const alertsCreated: AnalyzeResponse["alerts_created"] = [];

  const persistAlert = async (
    alert: Omit<Alert, "sms_sent" | "sms_sent_at" | "created_at">,
  ) => {
    const written = await writeAlertToDb(supabase, alert);
    if (!written) return;

    alertsCreated.push({
      id: written.id,
      scenario: written.scenario,
      severity: written.severity,
      headline: written.headline,
    });
  };

  if (currentBiz) {
    logAnalyze(businessId, "detecting_runway_alert");
    const runwayAlert = detectRunwayAlert(currentBiz);
    if (runwayAlert) {
      await persistAlert(runwayAlert);
    }
  }

  logAnalyze(businessId, "detecting_overdue_invoice_alerts");
  const overdueAlerts = detectOverdueInvoiceAlerts(
    businessId,
    allTransactions,
    forecast.days,
  );
  for (const alert of overdueAlerts) {
    await persistAlert(alert);
  }

  logAnalyze(businessId, "detecting_subscription_waste_alerts");
  const subscriptionAlerts = await detectSubscriptionWasteAlerts(
    businessId,
    allTransactions,
    gemini,
  );
  for (const alert of subscriptionAlerts) {
    await persistAlert(alert);
  }

  const { count: alertCountAfterWrite, error: alertCountError } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId);

  logAnalyze(businessId, "alert_count_after_write", {
    alert_count: alertCountAfterWrite ?? 0,
    count_error: alertCountError?.message ?? null,
  });

  logAnalyze(businessId, "complete", {
    categorized,
    alerts_created: alertsCreated.length,
    duration_ms: Date.now() - startedAt,
  });

  return {
    business_id: businessId,
    transactions_categorized: categorized,
    runway_days: runway.runway_days,
    runway_severity: runway.runway_severity,
    alerts_created: alertsCreated,
    sms_sent: false,
  };
}

export async function analyzeBusiness(
  businessId: string,
  options?: { onProgress?: AnalyzeProgressCallback },
): Promise<AnalyzeResponse> {
  const startedAt = Date.now();
  const onProgress = options?.onProgress;

  logAnalyze(businessId, "start");
  logAnalyze(businessId, "clients_ready");

  logAnalyze(businessId, "checking_business");
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .single();

  if (businessError || !business) {
    logAnalyze(businessId, "business_not_found");
    throw new AnalyzePipelineError(
      "BUSINESS_NOT_FOUND",
      "Business not found.",
    );
  }

  logAnalyze(businessId, "fetching_uncategorized_transactions");
  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("*")
    .eq("business_id", businessId)
    .is("category", null);

  if (transactionsError) {
    logAnalyze(businessId, "fetch_transactions_failed");
    console.error("Failed to fetch transactions:", transactionsError);
    throw new AnalyzePipelineError(
      "DB_QUERY_FAILED",
      "Failed to fetch transactions.",
    );
  }

  const uncategorizedTransactions = (transactions ?? []) as Transaction[];
  logAnalyze(businessId, "uncategorized_transactions_loaded", {
    count: uncategorizedTransactions.length,
  });

  const totalBatches = Math.ceil(
    uncategorizedTransactions.length / ANALYZE_BATCH_SIZE,
  );
  await emitProgress(onProgress, {
    type: "analysis_started",
    business_id: businessId,
    total_transactions: uncategorizedTransactions.length,
    batch_size: ANALYZE_BATCH_SIZE,
    total_batches: totalBatches,
  });

  if (uncategorizedTransactions.length === 0) {
    try {
      logAnalyze(
        businessId,
        "no_uncategorized_transactions_recomputing_runway",
      );
      const runway = await recomputeRunway(businessId);
      logAnalyze(businessId, "runway_recomputed_without_ai", {
        runway_days: runway.runway_days,
        duration_ms: Date.now() - startedAt,
      });

      const completed: AnalyzeCompletedEvent = {
        type: "analysis_completed",
        business_id: businessId,
        transactions_categorized: 0,
        runway_days: runway.runway_days,
        runway_severity: runway.runway_severity,
        alerts_created: [],
        sms_sent: false,
      };
      await emitProgress(onProgress, completed);
      return completed;
    } catch (error) {
      logAnalyze(businessId, "runway_recompute_failed_without_ai", {
        duration_ms: Date.now() - startedAt,
      });
      if (error instanceof AnalyzePipelineError) {
        throw error;
      }
      throw new AnalyzePipelineError(
        "RUNWAY_RECOMPUTE_FAILED",
        "Failed to recompute runway.",
      );
    }
  }

  const transactionById = new Map(
    uncategorizedTransactions.map((transaction) => [transaction.id, transaction]),
  );
  const batches = Array.from({ length: totalBatches }, (_, index) => ({
    batchNumber: index + 1,
    batch: uncategorizedTransactions.slice(
      index * ANALYZE_BATCH_SIZE,
      (index + 1) * ANALYZE_BATCH_SIZE,
    ),
  }));

  logAnalyze(businessId, "gemini_batches_prepared", {
    total_batches: batches.length,
    concurrency: ANALYZE_GEMINI_CONCURRENCY,
  });

  const outcomes: BatchOutcome[] = [];

  try {
    for (let index = 0; index < batches.length; index += ANALYZE_GEMINI_CONCURRENCY) {
      const slice = batches.slice(index, index + ANALYZE_GEMINI_CONCURRENCY);
      const batchOutcomes = await Promise.all(
        slice.map(({ batchNumber, batch }) =>
          processBatch(
            businessId,
            batchNumber,
            batch,
            transactionById,
            onProgress,
          ),
        ),
      );
      outcomes.push(...batchOutcomes);
    }
  } catch (error) {
    logAnalyze(businessId, "gemini_batch_failed", {
      duration_ms: Date.now() - startedAt,
    });
    if (error instanceof AnalyzePipelineError) {
      if (error.code === "ANALYZE_FAILED") {
        console.error(
          `[analyze:${businessId}] Gemini categorization failed`,
          error,
        );
      }
      throw error;
    }
    console.error(`[analyze:${businessId}] Gemini categorization failed`, error);
    throw new AnalyzePipelineError(
      "ANALYZE_FAILED",
      "AI categorization failed. Please try again.",
    );
  }

  const categorized = outcomes.reduce(
    (sum, outcome) => sum + outcome.batchSize,
    0,
  );
  logAnalyze(businessId, "categorizations_written", {
    categorized,
  });

  const { count: categorizedCountAfterWrite, error: categorizedCountError } =
    await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .not("category", "is", null);

  logAnalyze(businessId, "categorized_count_after_write", {
    categorized_count: categorizedCountAfterWrite ?? 0,
    count_error: categorizedCountError?.message ?? null,
  });

  try {
    const completed = await runPostProcessing(
      businessId,
      categorized,
      startedAt,
    );
    await emitProgress(onProgress, {
      type: "analysis_completed",
      ...completed,
    });
    return completed;
  } catch (error) {
    logAnalyze(businessId, "post_processing_failed", {
      duration_ms: Date.now() - startedAt,
    });
    console.error(`[analyze:${businessId}] post-processing failed`, error);
    if (error instanceof AnalyzePipelineError) {
      throw error;
    }
    throw new AnalyzePipelineError(
      "RUNWAY_RECOMPUTE_FAILED",
      "Failed to recompute runway.",
    );
  }
}

export function analyzeErrorToResponse(
  error: unknown,
): NextResponse<AnalyzeResponse> {
  if (error instanceof AnalyzePipelineError) {
    if (error.code === "BUSINESS_NOT_FOUND") {
      return notFound(error.message, error.code) as never;
    }

    return serverError(error.message, error.code) as never;
  }

  return serverError(
    "Analysis failed. Please try again.",
    "ANALYZE_FAILED",
  ) as never;
}
