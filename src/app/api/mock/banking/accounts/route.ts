import { NextResponse } from "next/server";
import type { MockBankingResponse } from "@/lib/types";
import { generateBankingData } from "@/lib/seed-data";

// Dev 1 — D1-03: Returns current balance + transaction history including non-Stripe items.
// next_payroll_due = today+8, next_insurance_due = today+7 (relative dates).
// These future obligations combined with the unpaid Durham Catering invoice create
// the payroll-miss scenario that fires the red alert.
export async function GET(): Promise<NextResponse<MockBankingResponse>> {
  const { account, transactions } = generateBankingData("mock_preview");

  const withNullCategory = transactions.map((t) => ({
    ...t,
    category: null as null,
  }));

  // next_payroll_due and next_insurance_due are returned as top-level meta
  // for the forecast engine (not in the MockBankingResponse account shape).
  const { next_payroll_due, next_insurance_due, ...accountShape } = account;

  return NextResponse.json({
    account: accountShape,
    transactions: withNullCategory,
    count: withNullCategory.length,
    // Expose future obligation dates for Dev 2 forecast engine
    meta: { next_payroll_due, next_insurance_due },
  } as MockBankingResponse & { meta: { next_payroll_due: string; next_insurance_due: string } });
}
