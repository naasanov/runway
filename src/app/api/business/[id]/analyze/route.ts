import { NextResponse } from "next/server";
import type { AnalyzeResponse, Transaction, Category, RecurrencePattern } from "@/lib/types";
import { CATEGORIES, RECURRENCE_PATTERNS } from "@/lib/types";
import { notFound, serverError } from "@/lib/errors";

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
    // Nothing to categorize — return current state
    const { data: biz } = await supabase
      .from("businesses")
      .select("runway_days, runway_severity")
      .eq("id", businessId)
      .single();

    return NextResponse.json<AnalyzeResponse>({
      business_id: businessId,
      transactions_categorized: 0,
      runway_days: biz?.runway_days ?? 0,
      runway_severity: biz?.runway_severity ?? "green",
      alerts_created: [],
      sms_sent: false,
    });
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

  // TODO: D2-02/D2-03 will add forecast + runway calculation here

  // --- D4: Alert scenario detection ---
  const { detectRunwayAlert, writeAlertToDb, clearExistingAlerts } = await import(
    "@/lib/alert-scenarios"
  );

  // Clear old alerts before generating new ones
  await clearExistingAlerts(supabase, businessId);

  // Fetch current business state (runway_days written by D2's forecast)
  const { data: currentBiz } = await supabase
    .from("businesses")
    .select("id, current_balance, runway_days, runway_severity")
    .eq("id", businessId)
    .single();

  const alertsCreated: AnalyzeResponse["alerts_created"] = [];

  // Scenario 1: Runway alert
  if (currentBiz) {
    const runwayAlert = detectRunwayAlert(currentBiz);
    if (runwayAlert) {
      const written = await writeAlertToDb(supabase, runwayAlert);
      if (written) {
        alertsCreated.push({
          id: written.id,
          scenario: written.scenario,
          severity: written.severity,
          headline: written.headline,
        });
      }
    }
  }

  // TODO: D4-03 Scenario 2 — Overdue Invoice
  // TODO: D4-04 Scenario 3 — Subscription Waste
  // TODO: D4-05 Scenario 4 — Revenue Concentration

  return NextResponse.json<AnalyzeResponse>({
    business_id: businessId,
    transactions_categorized: categorized,
    runway_days: currentBiz?.runway_days ?? 0,
    runway_severity: currentBiz?.runway_severity ?? "green",
    alerts_created: alertsCreated,
    sms_sent: false,
  });
}
