import { NextResponse } from "next/server";
import type { AnalyzeResponse } from "@/lib/types";

// TODO: implement — Dev 2 owns this
export async function POST(): Promise<NextResponse<AnalyzeResponse>> {
  return NextResponse.json({
    business_id: "biz-sweet-grace-001",
    transactions_categorized: 400,
    runway_days: 47,
    runway_severity: "amber",
    alerts_created: [
      {
        id: "alert-0091",
        scenario: "runway",
        severity: "amber",
        headline: "You have 47 days of cash remaining at current burn rate.",
      },
      {
        id: "alert-0092",
        scenario: "overdue_invoice",
        severity: "red",
        headline: "Durham Catering Co owes $3,200 and is 12 days overdue.",
      },
      {
        id: "alert-0093",
        scenario: "subscription_waste",
        severity: "amber",
        headline:
          "You're paying $134/month for two scheduling tools that overlap.",
      },
      {
        id: "alert-0094",
        scenario: "revenue_concentration",
        severity: "red",
        headline:
          "62% of your revenue in the last 90 days came from one client.",
      },
    ],
    sms_sent: true,
  });
}
