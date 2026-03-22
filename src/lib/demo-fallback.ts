import type { Category, RecurrencePattern, Transaction } from "./types";

export interface DemoCategorizationResult {
  id: string;
  category: Category;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
}

function hasTag(transaction: Transaction, tag: string): boolean {
  return transaction.tags.includes(tag);
}

export function isGeminiServiceUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const maybeStatus = (error as Error & { status?: number }).status;

  return (
    maybeStatus === 503 ||
    message.includes("service unavailable") ||
    message.includes("service not available") ||
    message.includes("temporarily unavailable") ||
    message.includes("overloaded")
  );
}

export function inferDemoCategorization(
  transaction: Transaction
): DemoCategorizationResult {
  const description = transaction.description.toLowerCase();

  if (transaction.transaction_type === "invoice") {
    return {
      id: transaction.id,
      category: "revenue",
      is_recurring: false,
      recurrence_pattern: null,
    };
  }

  if (
    description.includes("stripe payment") ||
    description.includes("cash deposit") ||
    hasTag(transaction, "retail") ||
    hasTag(transaction, "deposit")
  ) {
    return {
      id: transaction.id,
      category: "revenue",
      is_recurring: false,
      recurrence_pattern: null,
    };
  }

  if (description.includes("payroll") || hasTag(transaction, "payroll")) {
    return {
      id: transaction.id,
      category: "payroll",
      is_recurring: true,
      recurrence_pattern: "biweekly",
    };
  }

  if (description.includes("rent") || hasTag(transaction, "rent")) {
    return {
      id: transaction.id,
      category: "rent",
      is_recurring: true,
      recurrence_pattern: "monthly",
    };
  }

  if (description.includes("insurance") || hasTag(transaction, "insurance")) {
    return {
      id: transaction.id,
      category: "insurance",
      is_recurring: true,
      recurrence_pattern: "quarterly",
    };
  }

  if (
    description.includes("flour") ||
    hasTag(transaction, "supplier") ||
    hasTag(transaction, "ingredients")
  ) {
    return {
      id: transaction.id,
      category: "supplies",
      is_recurring: true,
      recurrence_pattern: "monthly",
    };
  }

  if (hasTag(transaction, "subscription")) {
    return {
      id: transaction.id,
      category: "subscriptions",
      is_recurring: true,
      recurrence_pattern: "monthly",
    };
  }

  return {
    id: transaction.id,
    category: "unknown",
    is_recurring: false,
    recurrence_pattern: null,
  };
}

export function inferDemoCategorizationBatch(
  transactions: Transaction[]
): DemoCategorizationResult[] {
  return transactions.map(inferDemoCategorization);
}
