import { NextResponse } from "next/server";
import type { AlertsResponse } from "@/lib/types";

// TODO: implement — Dev 4 owns this
export async function GET(): Promise<NextResponse<AlertsResponse>> {
  return NextResponse.json({
    business_id: "biz-sweet-grace-001",
    alerts: [
      {
        id: "alert-0092",
        business_id: "biz-sweet-grace-001",
        scenario: "overdue_invoice",
        severity: "red",
        headline: "Durham Catering Co owes $3,200 and is 12 days overdue.",
        detail:
          "If not collected by March 25, you will not cover the $2,200 payroll shortfall on March 28.",
        recommended_actions: [
          {
            action: "Send payment reminder",
            target: "Durham Catering Co",
            amount: 3200,
            impact: "Covers payroll shortfall with $1,000 buffer",
          },
        ],
        sms_sent: true,
        sms_sent_at: "2026-03-21T02:00:00Z",
        created_at: "2026-03-21T02:00:00Z",
      },
    ],
  });
}
