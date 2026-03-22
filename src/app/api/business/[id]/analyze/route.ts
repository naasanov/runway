import { NextResponse } from "next/server";
import type { AnalyzeResponse, Transaction, Category, RecurrencePattern } from "@/lib/types";
import { CATEGORIES, RECURRENCE_PATTERNS } from "@/lib/types";
import { notFound, serverError } from "@/lib/errors";
import { computeForecast } from "@/lib/forecast";

const BATCH_SIZE = 50;

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

async function recomputeRunway(
  businessId: string,
): Promise<{ runway_days: number; runway_severity: "red" | "amber" | "green" }> {
  const { supabase } = await import("@/lib/supabase");

  const [{ data: business, error: businessError }, { data: transactions, error: transactionsError }] =
    await Promise.all([
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

  const { supabase } = await import("@/lib/supabase");
  const { gemini } = await import("@/lib/gemini");

  // Verify business exists
  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .single();

  if (bizErr || !business) {
    return notFound("Business not found.", "BUSINESS_NOT_FOUND");
  }

  // Fetch uncategorized transactions
  const { data: transactions, error: txnErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("business_id", businessId)
    .is("category", null);

  if (txnErr) {
    console.error("Failed to fetch transactions:", txnErr);
    return serverError("Failed to fetch transactions.", "DB_QUERY_FAILED");
  }

  if (!transactions || transactions.length === 0) {
    try {
      const runway = await recomputeRunway(businessId);

      return NextResponse.json<AnalyzeResponse>({
        business_id: businessId,
        transactions_categorized: 0,
        runway_days: runway.runway_days,
        runway_severity: runway.runway_severity,
        alerts_created: [],
        sms_sent: false,
      });
    } catch {
      return serverError(
        "Failed to recompute runway.",
        "RUNWAY_RECOMPUTE_FAILED",
      );
    }
  }

  // Batch transactions and send to Gemini
  const results: GeminiCategorizationResult[] = [];

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);

    // Send only the fields Gemini needs
    const stripped = batch.map((t: Transaction) => ({
      id: t.id,
      amount: t.amount,
      description: t.description,
      transaction_type: t.transaction_type,
      tags: t.tags,
      date: t.date,
    }));

    try {
      const response = await gemini.generateContent([
        SYSTEM_PROMPT,
        `Categorize these ${stripped.length} transactions:\n${JSON.stringify(stripped)}`,
      ]);

      const text = response.response.text();
      // Strip markdown fences if present
      const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const parsed: GeminiCategorizationResult[] = JSON.parse(cleaned);
      results.push(...parsed);
    } catch (err) {
      console.error(`Gemini batch ${i / BATCH_SIZE + 1} failed:`, err);
      return serverError(
        "AI categorization failed. Please try again.",
        "ANALYZE_FAILED"
      );
    }
  }

  // Validate and write results back to DB
  let categorized = 0;

  for (const result of results) {
    const category = CATEGORIES.includes(result.category as Category)
      ? result.category
      : "unknown";

    const recurrence_pattern =
      result.is_recurring && result.recurrence_pattern &&
      RECURRENCE_PATTERNS.includes(result.recurrence_pattern as RecurrencePattern)
        ? result.recurrence_pattern
        : null;

    const { error: updateErr } = await supabase
      .from("transactions")
      .update({
        category,
        is_recurring: result.is_recurring ?? false,
        recurrence_pattern,
      })
      .eq("id", result.id)
      .eq("business_id", businessId);

    if (updateErr) {
      console.error(`Failed to update transaction ${result.id}:`, updateErr);
    } else {
      categorized++;
    }
  }

  try {
    const runway = await recomputeRunway(businessId);
    const {
      detectRunwayAlert,
      detectOverdueInvoiceAlerts,
      detectSubscriptionWasteAlerts,
      writeAlertToDb,
      clearExistingAlerts,
    } = await import("@/lib/alert-scenarios");

    // Clear old alerts before generating new ones
    await clearExistingAlerts(supabase, businessId);

    // Fetch current business state after runway has been recomputed
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
    const { computeForecast: computeForecastForAlerts } = await import("@/lib/forecast");
    const forecast = computeForecastForAlerts(
      allTransactions,
      currentBiz?.current_balance ?? 0,
      30,
    );

    const alertsCreated: AnalyzeResponse["alerts_created"] = [];

    const persistAlert = async (
      alert: Omit<import("@/lib/types").Alert, "sms_sent" | "sms_sent_at" | "created_at">,
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
      const runwayAlert = detectRunwayAlert(currentBiz);
      if (runwayAlert) await persistAlert(runwayAlert);
    }

    // Scenario 2: Overdue Invoice alerts
    const overdueAlerts = detectOverdueInvoiceAlerts(
      businessId,
      allTransactions,
      forecast.days,
    );
    for (const alert of overdueAlerts) {
      await persistAlert(alert);
    }

    // Scenario 3: Subscription Waste alerts
    const subAlerts = await detectSubscriptionWasteAlerts(
      businessId,
      allTransactions,
      gemini,
    );
    for (const alert of subAlerts) {
      await persistAlert(alert);
    }

    // TODO: D4-05 Scenario 4 — Revenue Concentration

    return NextResponse.json<AnalyzeResponse>({
      business_id: businessId,
      transactions_categorized: categorized,
      runway_days: runway.runway_days,
      runway_severity: runway.runway_severity,
      alerts_created: alertsCreated,
      sms_sent: false,
    });
  } catch {
    return serverError(
      "Failed to recompute runway.",
      "RUNWAY_RECOMPUTE_FAILED",
    );
  }
}
