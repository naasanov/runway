import { NextResponse } from "next/server";

// TODO: implement — Dev 1 owns this
export async function GET() {
  return NextResponse.json({
    transactions: [
      {
        id: "txn-00482",
        business_id: "biz-sweet-grace-001",
        source: "stripe",
        transaction_type: "invoice",
        invoice_status: "unpaid",
        invoice_date: "2026-03-09",
        customer_id: "cust-durham-catering",
        amount: 3200.0,
        description: "Durham Catering Co — Invoice #1021",
        category: null,
        date: "2026-03-09",
        is_recurring: false,
        recurrence_pattern: null,
        tags: ["catering", "wholesale"],
      },
    ],
    count: 1,
  });
}
