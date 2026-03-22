import {
  addDays,
  addMonths,
  addQuarters,
  format,
  parseISO,
  subDays,
} from "date-fns";
import type {
  Category,
  ForecastDay,
  Severity,
  Transaction,
} from "@/lib/types";

export const VALID_HORIZONS = [30, 60, 90] as const;
export type ForecastHorizon = (typeof VALID_HORIZONS)[number];

interface RecurringObligation {
  description: string;
  amount: number;
  category: Category;
  pattern: "weekly" | "biweekly" | "monthly" | "quarterly";
  lastDate: Date;
}

export interface ForecastComputation {
  avgDailyRevenue: number;
  avgDailyNetBurn: number;
  runwayDays: number;
  runwaySeverity: Severity;
  firstNegativeDate: string | null;
  days: ForecastDay[];
  dangerDates: string[];
  minProjectedBalance: number;
  upcomingObligations: {
    description: string;
    amount: number;
    due_date: string;
    category: Category;
    is_recurring: boolean;
  }[];
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function getNextOccurrences(
  obligation: RecurringObligation,
  from: Date,
  to: Date,
): Date[] {
  const dates: Date[] = [];
  let cursor = new Date(obligation.lastDate);

  const advance = (date: Date): Date => {
    switch (obligation.pattern) {
      case "weekly":
        return addDays(date, 7);
      case "biweekly":
        return addDays(date, 14);
      case "monthly":
        return addMonths(date, 1);
      case "quarterly":
        return addQuarters(date, 1);
    }
  };

  while (cursor <= to) {
    cursor = advance(cursor);
    if (cursor >= from && cursor <= to) {
      dates.push(new Date(cursor));
    }
  }

  return dates;
}

export function computeTrailingDailyRevenue(
  transactions: Transaction[],
  today: Date,
): number {
  const windowStart = subDays(today, 30);
  let total = 0;

  for (const txn of transactions) {
    const date = parseISO(txn.date);
    if (
      date >= windowStart &&
      date <= today &&
      txn.amount > 0 &&
      txn.category === "revenue"
    ) {
      total += txn.amount;
    }
  }

  return total / 30;
}

export function extractRecurringObligations(
  transactions: Transaction[],
): RecurringObligation[] {
  const groups = new Map<
    string,
    { amount: number; category: Category; pattern: string; latestDate: Date }
  >();

  for (const txn of transactions) {
    if (
      !txn.is_recurring ||
      !txn.recurrence_pattern ||
      txn.amount >= 0 ||
      txn.category === null ||
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
        category: txn.category,
        pattern: txn.recurrence_pattern,
        latestDate: date,
      });
    }
  }

  return Array.from(groups.entries()).map(([description, info]) => ({
    description,
    amount: info.amount,
    category: info.category,
    pattern: info.pattern as RecurringObligation["pattern"],
    lastDate: info.latestDate,
  }));
}

export function getRunwaySeverity(runwayDays: number): Severity {
  if (runwayDays < 30) {
    return "red";
  }
  if (runwayDays < 60) {
    return "amber";
  }
  return "green";
}

export function isValidForecastHorizon(
  horizon: number,
): horizon is ForecastHorizon {
  return (VALID_HORIZONS as readonly number[]).includes(horizon);
}

export function computeForecast(
  transactions: Transaction[],
  currentBalance: number,
  horizon: ForecastHorizon,
  today = new Date(),
): ForecastComputation {
  const avgDailyRevenue = computeTrailingDailyRevenue(transactions, today);
  const obligations = extractRecurringObligations(transactions);
  const horizonEnd = addDays(today, horizon);

  const obligationsByDate = new Map<
    string,
    { description: string; amount: number; category: Category }[]
  >();

  for (const obligation of obligations) {
    const occurrences = getNextOccurrences(obligation, today, horizonEnd);
    for (const date of occurrences) {
      const key = format(date, "yyyy-MM-dd");
      const existing = obligationsByDate.get(key) ?? [];
      existing.push({
        description: obligation.description,
        amount: obligation.amount,
        category: obligation.category,
      });
      obligationsByDate.set(key, existing);
    }
  }

  const days: ForecastDay[] = [];
  const dangerDates: string[] = [];
  let balance = currentBalance;
  let minProjectedBalance = currentBalance;
  let firstNegativeDate: string | null = null;

  for (let index = 0; index < horizon; index += 1) {
    const date = addDays(today, index);
    const dateString = format(date, "yyyy-MM-dd");
    const dayObligations = (obligationsByDate.get(dateString) ?? []).map(
      ({ description, amount }) => ({ description, amount }),
    );
    const totalObligations = dayObligations.reduce(
      (sum, obligation) => sum + obligation.amount,
      0,
    );

    if (index > 0) {
      balance += avgDailyRevenue - totalObligations;
    }

    const roundedBalance = roundCurrency(balance);
    const isDanger = roundedBalance < 0;

    if (isDanger && firstNegativeDate === null) {
      firstNegativeDate = dateString;
    }

    if (isDanger) {
      dangerDates.push(dateString);
    }

    minProjectedBalance = Math.min(minProjectedBalance, roundedBalance);

    days.push({
      date: dateString,
      projected_balance: roundedBalance,
      is_danger: isDanger,
      obligations: dayObligations,
      expected_revenue: roundCurrency(avgDailyRevenue),
    });
  }

  const totalDailyExpenses = obligations.reduce((sum, obligation) => {
    switch (obligation.pattern) {
      case "weekly":
        return sum + obligation.amount / 7;
      case "biweekly":
        return sum + obligation.amount / 14;
      case "monthly":
        return sum + obligation.amount / 30;
      case "quarterly":
        return sum + obligation.amount / 90;
    }
  }, 0);

  const avgDailyNetBurn = totalDailyExpenses - avgDailyRevenue;
  const runwayDays =
    avgDailyNetBurn > 0 ? Math.floor(currentBalance / avgDailyNetBurn) : 999;

  return {
    avgDailyRevenue: roundCurrency(avgDailyRevenue),
    avgDailyNetBurn: roundCurrency(avgDailyNetBurn),
    runwayDays,
    runwaySeverity: getRunwaySeverity(runwayDays),
    firstNegativeDate,
    days,
    dangerDates,
    minProjectedBalance: roundCurrency(minProjectedBalance),
    upcomingObligations: Array.from(obligationsByDate.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([dueDate, dueObligations]) =>
        dueObligations.map((obligation) => ({
          description: obligation.description,
          amount: obligation.amount,
          due_date: dueDate,
          category: obligation.category,
          is_recurring: true,
        })),
      ),
  };
}
