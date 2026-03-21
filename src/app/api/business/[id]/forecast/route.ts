import { NextResponse } from "next/server";

// TODO: implement — Dev 2 owns this
export async function GET() {
  return NextResponse.json({
    business_id: "biz-sweet-grace-001",
    generated_at: "2026-03-21T18:00:00Z",
    horizon_days: 30,
    current_balance: 4847.23,
    avg_daily_net_burn: 102.07,
    runway_days: 47,
    first_negative_date: "2026-03-28",
    days: [
      {
        date: "2026-03-22",
        projected_balance: 4847.23,
        is_danger: false,
        obligations: [],
        expected_revenue: 480.0,
      },
      {
        date: "2026-03-28",
        projected_balance: -2200.0,
        is_danger: true,
        obligations: [
          { description: "Payroll", amount: 3800.0 },
          { description: "Insurance", amount: 1200.0 },
        ],
        expected_revenue: 1400.0,
      },
    ],
  });
}
