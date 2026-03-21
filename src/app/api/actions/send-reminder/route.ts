import { NextResponse } from "next/server";

// TODO: implement — Dev 4 owns this
export async function POST() {
  return NextResponse.json({
    sent: true,
    sent_at: "2026-03-21T18:32:00Z",
    to: "Durham Catering Co",
    subject: "Payment Reminder: Invoice #1021 — $3,200.00 overdue",
    message_preview:
      "Hi Durham Catering, this is a friendly reminder that Invoice #1021 for $3,200.00 is 12 days past due. Please remit payment at your earliest convenience.",
  });
}
