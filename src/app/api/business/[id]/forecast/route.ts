import { NextRequest, NextResponse } from "next/server";
import {
  addDays,
  format,
  parseISO,
  subDays,
} from "date-fns";
import type { ForecastDay, ForecastResponse, Transaction } from "@/lib/types";
import { badRequest, notFound, serverError } from "@/lib/errors";

const VALID_HORIZONS = [30, 60, 90];

interface RecurringObligation {
  description: string;
  amount: number;
  pattern: "weekly" | "biweekly" | "monthly" | "quarterly";
  lastDate: Date;
}

function getNextOccurrences(
  obligation: RecurringObligation,
  from: Date,
  to: Date
): Date[] {
  const dates: Date[] = [];
  let cursor = new Date(obligation.lastDate);

  const advance = (d: Date): Date => {
    switch (obligation.pattern) {
      case "weekly":
        return addDays(d, 7);
      case "biweekly":
        return addDays(d, 14);
      case "monthly": {
        const next = new Date(d);
        next.setMonth(next.getMonth() + 1);
        return next;
      }
      case "quarterly": {
        const next = new Date(d);
        next.setMonth(next.getMonth() + 3);
        return next;
      }
    }
  };

  // Walk forward from last known date until we pass the horizon end
  while (cursor <= to) {
    cursor = advance(cursor);
    if (cursor >= from && cursor <= to) {
      dates.push(new Date(cursor));
    }
  }
  return dates;
}

function computeTrailingDailyRevenue(
  transactions: Transaction[],
  today: Date
): number {
  const windowStart = subDays(today, 30);
  let total = 0;
  for (const txn of transactions) {
    const d = parseISO(txn.date);
    if (
      d >= windowStart &&
      d <= today &&
      txn.amount > 0 &&
      txn.category === "revenue"
    ) {
      total += txn.amount;
    }
  }
  return total / 30;
}

function extractRecurringObligations(
  transactions: Transaction[]
): RecurringObligation[] {
  // Group recurring expenses by description to find the most recent occurrence
  const groups = new Map<
    string,
    { amount: number; pattern: string; latestDate: Date }
  >();

  for (const txn of transactions) {
    if (
      !txn.is_recurring ||
      !txn.recurrence_pattern ||
      txn.amount >= 0 ||
      txn.category === "revenue"
    ) {
      continue;
    }

    const key = txn.description;
    const date = parseISO(txn.date);
    const existing = groups.get(key);

    if (!existing || date > existing.latestDate) {
      groups.set(key, {
        amount: Math.abs(txn.amount),
        pattern: txn.recurrence_pattern,
        latestDate: date,
      });
    }
  }

  return Array.from(groups.entries()).map(([desc, info]) => ({
    description: desc,
    amount: info.amount,
    pattern: info.pattern as RecurringObligation["pattern"],
    lastDate: info.latestDate,
  }));
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ForecastResponse>> {
  const { supabase } = await import("@/lib/supabase");
  const businessId = params.id;

  // Parse horizon query param
  const horizonParam = req.nextUrl.searchParams.get("horizon");
  const horizon = horizonParam ? parseInt(horizonParam, 10) : 30;
  if (!VALID_HORIZONS.includes(horizon)) {
    return badRequest(
      `horizon must be one of: ${VALID_HORIZONS.join(", ")}`,
      "INVALID_HORIZON"
    ) as never;
  }

  // Fetch business
  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("id, current_balance")
    .eq("id", businessId)
    .single();

  if (bizErr || !business) {
    return notFound("Business not found.", "BUSINESS_NOT_FOUND") as never;
  }

  // Fetch all categorized transactions
  const { data: transactions, error: txnErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("business_id", businessId);

  if (txnErr) {
    return serverError(
      "Failed to fetch transactions.",
      "DB_QUERY_FAILED"
    ) as never;
  }

  const txns = (transactions ?? []) as Transaction[];
  const today = new Date();

  // Compute trailing 30-day average daily revenue
  const avgDailyRevenue = computeTrailingDailyRevenue(txns, today);

  // Extract recurring obligations
  const obligations = extractRecurringObligations(txns);

  // Build day-by-day forecast
  const days: ForecastDay[] = [];
  let balance = business.current_balance;
  let firstNegativeDate: string | null = null;

  const horizonEnd = addDays(today, horizon);

  // Pre-compute all obligation occurrences in the forecast window
  const obligationsByDate = new Map<
    string,
    { description: string; amount: number }[]
  >();
  for (const obl of obligations) {
    const occurrences = getNextOccurrences(obl, today, horizonEnd);
    for (const d of occurrences) {
      const key = format(d, "yyyy-MM-dd");
      const existing = obligationsByDate.get(key) ?? [];
      existing.push({ description: obl.description, amount: obl.amount });
      obligationsByDate.set(key, existing);
    }
  }

  for (let i = 0; i < horizon; i++) {
    const date = addDays(today, i);
    const dateStr = format(date, "yyyy-MM-dd");

    const dayObligations = obligationsByDate.get(dateStr) ?? [];
    const totalObligations = dayObligations.reduce(
      (sum, o) => sum + o.amount,
      0
    );

    // Apply revenue and obligations to balance
    if (i > 0) {
      balance += avgDailyRevenue - totalObligations;
    }

    const isDanger = balance < 0;
    if (isDanger && !firstNegativeDate) {
      firstNegativeDate = dateStr;
    }

    days.push({
      date: dateStr,
      projected_balance: Math.round(balance * 100) / 100,
      is_danger: isDanger,
      obligations: dayObligations,
      expected_revenue: Math.round(avgDailyRevenue * 100) / 100,
    });
  }

  // Compute burn rate and runway
  const totalDailyExpenses =
    obligations.reduce((sum, o) => {
      switch (o.pattern) {
        case "weekly":
          return sum + o.amount / 7;
        case "biweekly":
          return sum + o.amount / 14;
        case "monthly":
          return sum + o.amount / 30;
        case "quarterly":
          return sum + o.amount / 90;
      }
    }, 0);

  const avgDailyNetBurn = totalDailyExpenses - avgDailyRevenue;
  const runwayDays =
    avgDailyNetBurn > 0
      ? Math.floor(business.current_balance / avgDailyNetBurn)
      : 999;

  return NextResponse.json({
    business_id: businessId,
    generated_at: new Date().toISOString(),
    horizon_days: horizon,
    current_balance: business.current_balance,
    avg_daily_net_burn: Math.round(avgDailyNetBurn * 100) / 100,
    runway_days: runwayDays,
    first_negative_date: firstNegativeDate,
    days,
  });
}
