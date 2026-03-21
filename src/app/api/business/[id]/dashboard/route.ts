import { NextResponse } from "next/server";

// TODO: implement — Dev 2 owns this
export async function GET() {
  return NextResponse.json({
    business: {
      id: "biz-sweet-grace-001",
      name: "Sweet Grace Bakery",
      current_balance: 4847.23,
      runway_days: 47,
      runway_severity: "amber",
    },
    alerts: [
      {
        id: "alert-0091",
        scenario: "runway",
        severity: "amber",
        headline: "You have 47 days of cash remaining at current burn rate.",
        detail:
          "Average daily net burn: $102.07. At this rate, cash runs out around May 7.",
        recommended_actions: [
          {
            action: "Collect overdue invoice",
            target: "Durham Catering Co",
            amount: 3200,
            impact: "Extends runway to 78 days",
          },
        ],
      },
    ],
    forecast_summary: {
      horizon_days: 30,
      min_projected_balance: -2200.0,
      danger_dates: ["2026-03-28"],
      days: [
        {
          date: "2026-03-22",
          projected_balance: 4847.23,
          is_danger: false,
          obligations: [],
          expected_revenue: 480.0,
        },
      ],
    },
    upcoming_obligations: [
      {
        description: "Payroll",
        amount: 3800.0,
        due_date: "2026-03-28",
        category: "payroll",
        is_recurring: true,
      },
      {
        description: "Quarterly Insurance",
        amount: 1200.0,
        due_date: "2026-03-28",
        category: "insurance",
        is_recurring: true,
      },
    ],
  });
}
