import { NextResponse } from "next/server";
import type { ScenarioResponse } from "@/lib/types";

// TODO: implement — Dev 4 owns this
export async function POST(): Promise<NextResponse<ScenarioResponse>> {
  return NextResponse.json({
    business_id: "biz-sweet-grace-001",
    baseline: {
      runway_days: 47,
      first_negative_date: "2026-03-28",
    },
    modeled: {
      runway_days: 39,
      first_negative_date: "2026-04-29",
      delta_days: -8,
    },
    scenarios_applied: [
      { type: "new_hire", impact_days: -25 },
      { type: "price_increase", impact_days: 14 },
      { type: "cut_expense", impact_days: 3 },
    ],
  });
}
