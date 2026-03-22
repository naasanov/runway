import { NextResponse } from "next/server";
import type { MockStripeResponse } from "@/lib/types";
import {
  generateConcentrationStripeTransactions,
  generateStripeTransactions,
} from "@/lib/seed-data";

// Dev 1 — D1-02: Returns 90 days of realistic Stripe-formatted bakery transactions.
// All dates are relative to today so the "9-days-to-payroll-miss" story is always accurate.
// category is null on all items — populated by /analyze after Gemini categorization.
export async function GET(
  req: Request
): Promise<NextResponse<MockStripeResponse>> {
  const scenario = new URL(req.url).searchParams.get("scenario");
  const transactions =
    scenario === "concentration"
      ? generateConcentrationStripeTransactions("mock_preview")
      : generateStripeTransactions("mock_preview");

  // Strip category so the mock mirrors real Stripe (uncategorized)
  const withNullCategory = transactions.map((t) => ({
    ...t,
    category: null as null,
  }));

  return NextResponse.json({
    transactions: withNullCategory,
    count: withNullCategory.length,
  });
}
