import { NextResponse } from "next/server";
import type { MockBankingResponse } from "@/lib/types";

// TODO: implement — Dev 1 owns this
export async function GET(): Promise<NextResponse<MockBankingResponse>> {
  return NextResponse.json({
    account: {
      id: "acct-sgb-checking",
      business_id: "biz-sweet-grace-001",
      type: "checking",
      current_balance: 4847.23,
      as_of: "2026-03-21",
    },
    transactions: [
      {
        id: "txn-bank-00109",
        business_id: "biz-sweet-grace-001",
        source: "banking",
        transaction_type: "debit",
        invoice_status: null,
        invoice_date: null,
        customer_id: null,
        amount: 1200.0,
        description: "Quarterly Insurance Payment",
        category: null,
        date: "2026-03-28",
        is_recurring: true,
        recurrence_pattern: "quarterly",
        tags: ["insurance"],
      },
    ],
    count: 1,
  });
}
