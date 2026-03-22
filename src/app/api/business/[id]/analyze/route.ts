import { notFound, serverError } from "@/lib/errors";
import { computeForecast } from "@/lib/forecast";
import type {
  AnalyzeResponse,
  Category,
  RecurrencePattern,
  Transaction,
} from "@/lib/types";
import { CATEGORIES, RECURRENCE_PATTERNS } from "@/lib/types";
import { NextResponse } from "next/server";

const BATCH_SIZE = 50;
const GEMINI_CONCURRENCY = 2;

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

interface GeminiCategorizationResult {
  id: string;
  category: string;
  is_recurring: boolean;
  recurrence_pattern: string | null;
}

function logAnalyze(
  businessId: string,
  stage: string,
  details?: Record<string, unknown>
) {
  const suffix = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[analyze:${businessId}] ${stage}${suffix}`);
}

async function recomputeRunway(businessId: string): Promise<{
  runway_days: number;
  runway_severity: "red" | "amber" | "green";
}> {
  const { supabase } = await import("@/lib/supabase");

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
    throw new Error("RUNWAY_RECOMPUTE_FAILED");
  }

  const forecast = computeForecast(
    (transactions ?? []) as Transaction[],
    business.current_balance,
    30
  );

  const { error: updateError } = await supabase
    .from("businesses")
    .update({
      runway_days: forecast.runwayDays,
      runway_severity: forecast.runwaySeverity,
    })
    .eq("id", businessId);

  if (updateError) {
    throw new Error("RUNWAY_RECOMPUTE_FAILED");
  }

  return {
    runway_days: forecast.runwayDays,
    runway_severity: forecast.runwaySeverity,
  };
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const businessId = params.id;
  const startedAt = Date.now();

  logAnalyze(businessId, "start");

  const { supabase } = await import("@/lib/supabase");
  const { gemini } = await import("@/lib/gemini");
  logAnalyze(businessId, "clients_ready");

  // Verify business exists
  logAnalyze(businessId, "checking_business");
  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .single();

  if (bizErr || !business) {
    logAnalyze(businessId, "business_not_found");
    return notFound("Business not found.", "BUSINESS_NOT_FOUND");
  }

  // Fetch uncategorized transactions
  logAnalyze(businessId, "fetching_uncategorized_transactions");
  const { data: transactions, error: txnErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("business_id", businessId)
    .is("category", null);

  if (txnErr) {
    logAnalyze(businessId, "fetch_transactions_failed");
    console.error("Failed to fetch transactions:", txnErr);
    return serverError("Failed to fetch transactions.", "DB_QUERY_FAILED");
  }

  logAnalyze(businessId, "uncategorized_transactions_loaded", {
    count: transactions?.length ?? 0,
  });

  if (!transactions || transactions.length === 0) {
    try {
      logAnalyze(
        businessId,
        "no_uncategorized_transactions_recomputing_runway"
      );
      const runway = await recomputeRunway(businessId);
      logAnalyze(businessId, "runway_recomputed_without_ai", {
        runway_days: runway.runway_days,
        duration_ms: Date.now() - startedAt,
      });

      return NextResponse.json<AnalyzeResponse>({
        business_id: businessId,
        transactions_categorized: 0,
        runway_days: runway.runway_days,
        runway_severity: runway.runway_severity,
        alerts_created: [],
        sms_sent: false,
      });
    } catch {
      logAnalyze(businessId, "runway_recompute_failed_without_ai", {
        duration_ms: Date.now() - startedAt,
      });
      return serverError(
        "Failed to recompute runway.",
        "RUNWAY_RECOMPUTE_FAILED"
      );
    }
  }

  // Batch transactions and send to Gemini with small parallelism.
  const batches = Array.from(
    { length: Math.ceil(transactions.length / BATCH_SIZE) },
    (_, index) => ({
      batchNumber: index + 1,
      batch: transactions.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE),
    })
  );
  const results: GeminiCategorizationResult[] = [];

  logAnalyze(businessId, "gemini_batches_prepared", {
    total_batches: batches.length,
    concurrency: GEMINI_CONCURRENCY,
  });

  async function processBatch(batchNumber: number, batch: Transaction[]) {
    const stripped = batch.map((t: Transaction) => ({
      id: t.id,
      amount: t.amount,
      description: t.description,
      transaction_type: t.transaction_type,
      tags: t.tags,
      date: t.date,
    }));

    logAnalyze(businessId, "gemini_batch_start", {
      batch: batchNumber,
      batch_size: stripped.length,
    });

    const response = await gemini.generateContent([
      SYSTEM_PROMPT,
      `Categorize these ${stripped.length} transactions:\n${JSON.stringify(stripped)}`,
    ]);

    const text = response.response.text();
    const cleaned = text
      .replace(/```json?\n?/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed: GeminiCategorizationResult[] = JSON.parse(cleaned);

    logAnalyze(businessId, "gemini_batch_done", {
      batch: batchNumber,
      parsed_count: parsed.length,
    });

    return parsed;
  }

  try {
    for (let i = 0; i < batches.length; i += GEMINI_CONCURRENCY) {
      const slice = batches.slice(i, i + GEMINI_CONCURRENCY);
      const chunkResults = await Promise.all(
        slice.map(({ batchNumber, batch }) => processBatch(batchNumber, batch))
      );
      results.push(...chunkResults.flat());
    }
  } catch (err) {
    logAnalyze(businessId, "gemini_batch_failed", {
      duration_ms: Date.now() - startedAt,
    });
    console.error(`[analyze:${businessId}] Gemini categorization failed`, err);
    return serverError(
      "AI categorization failed. Please try again.",
      "ANALYZE_FAILED"
    );
  }

  // Validate and write results back to DB
  logAnalyze(businessId, "writing_categorizations", {
    result_count: results.length,
  });
  const transactionById = new Map(
    transactions.map((transaction: Transaction) => [
      transaction.id,
      transaction,
    ])
  );

  const categorizedRows = results.map((result) => {
    const existingTransaction = transactionById.get(result.id);
    const category = CATEGORIES.includes(result.category as Category)
      ? result.category
      : "unknown";

    const recurrence_pattern =
      result.is_recurring &&
      result.recurrence_pattern &&
      RECURRENCE_PATTERNS.includes(
        result.recurrence_pattern as RecurrencePattern
      )
        ? result.recurrence_pattern
        : null;

    if (!existingTransaction) {
      throw new Error(`MISSING_TRANSACTION_FOR_RESULT:${result.id}`);
    }

    return {
      ...existingTransaction,
      category,
      is_recurring: result.is_recurring ?? false,
      recurrence_pattern,
    };
  });

  const { data: writtenRows, error: upsertErr } = await supabase
    .from("transactions")
    .upsert(categorizedRows, { onConflict: "id" })
    .select("id");

  if (upsertErr) {
    logAnalyze(businessId, "categorization_write_failed", {
      duration_ms: Date.now() - startedAt,
      row_count: categorizedRows.length,
    });
    console.error("Failed to bulk update categorizations:", upsertErr);
    return serverError(
      "Failed to write categorized transactions.",
      "DB_UPDATE_FAILED"
    );
  }

  const categorized = writtenRows?.length ?? categorizedRows.length;

  logAnalyze(businessId, "categorizations_written", {
    categorized,
  });

  try {
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

    // Clear old alerts before generating new ones
    logAnalyze(businessId, "clearing_existing_alerts");
    await clearExistingAlerts(supabase, businessId);

    // Fetch current business state after runway has been recomputed
    logAnalyze(businessId, "loading_business_and_transactions_for_alerts");
    const { data: currentBiz } = await supabase
      .from("businesses")
      .select("id, current_balance, runway_days, runway_severity")
      .eq("id", businessId)
      .single();

    // Fetch all categorized transactions + compute forecast for alert detectors
    const { data: allTxns } = await supabase
      .from("transactions")
      .select("*")
      .eq("business_id", businessId);

    const allTransactions = (allTxns ?? []) as Transaction[];
    logAnalyze(businessId, "alert_inputs_loaded", {
      transaction_count: allTransactions.length,
    });
    const { computeForecast: computeForecastForAlerts } =
      await import("@/lib/forecast");
    const forecast = computeForecastForAlerts(
      allTransactions,
      currentBiz?.current_balance ?? 0,
      30
    );
    logAnalyze(businessId, "alert_forecast_computed", {
      danger_dates: forecast.dangerDates.length,
      upcoming_obligations: forecast.upcomingObligations.length,
    });

    const alertsCreated: AnalyzeResponse["alerts_created"] = [];

    const persistAlert = async (
      alert: Omit<
        import("@/lib/types").Alert,
        "sms_sent" | "sms_sent_at" | "created_at"
      >
    ) => {
      const written = await writeAlertToDb(supabase, alert);
      if (written) {
        alertsCreated.push({
          id: written.id,
          scenario: written.scenario,
          severity: written.severity,
          headline: written.headline,
        });
      }
    };

    // Scenario 1: Runway alert
    if (currentBiz) {
      logAnalyze(businessId, "detecting_runway_alert");
      const runwayAlert = detectRunwayAlert(currentBiz);
      if (runwayAlert) await persistAlert(runwayAlert);
    }

    // Scenario 2: Overdue Invoice alerts
    logAnalyze(businessId, "detecting_overdue_invoice_alerts");
    const overdueAlerts = detectOverdueInvoiceAlerts(
      businessId,
      allTransactions,
      forecast.days
    );
    for (const alert of overdueAlerts) {
      await persistAlert(alert);
    }

    // Scenario 3: Subscription Waste alerts
    logAnalyze(businessId, "detecting_subscription_waste_alerts");
    const subAlerts = await detectSubscriptionWasteAlerts(
      businessId,
      allTransactions,
      gemini
    );
    for (const alert of subAlerts) {
      await persistAlert(alert);
    }

    // TODO: D4-05 Scenario 4 — Revenue Concentration

    logAnalyze(businessId, "complete", {
      categorized,
      alerts_created: alertsCreated.length,
      duration_ms: Date.now() - startedAt,
    });

    return NextResponse.json<AnalyzeResponse>({
      business_id: businessId,
      transactions_categorized: categorized,
      runway_days: runway.runway_days,
      runway_severity: runway.runway_severity,
      alerts_created: alertsCreated,
      sms_sent: false,
    });
  } catch (error) {
    logAnalyze(businessId, "post_processing_failed", {
      duration_ms: Date.now() - startedAt,
    });
    console.error(`[analyze:${businessId}] post-processing failed`, error);
    return serverError(
      "Failed to recompute runway.",
      "RUNWAY_RECOMPUTE_FAILED"
    );
  }
}
