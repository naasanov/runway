import { NextResponse } from "next/server";
import type {
  Alert,
  DashboardResponse,
  Transaction,
} from "@/lib/types";
import { computeForecast } from "@/lib/forecast";
import { notFound, serverError } from "@/lib/errors";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse<DashboardResponse>> {
  const { supabase } = await import("@/lib/supabase");
  const businessId = params.id;

  const [{ data: business, error: businessError }, { data: transactions, error: transactionsError }, { data: alerts, error: alertsError }] =
    await Promise.all([
      supabase
        .from("businesses")
        .select("id, name, current_balance, runway_days, runway_severity")
        .eq("id", businessId)
        .single(),
      supabase.from("transactions").select("*").eq("business_id", businessId),
      supabase
        .from("alerts")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }),
    ]);

  if (businessError || !business) {
    return notFound("Business not found.", "BUSINESS_NOT_FOUND") as never;
  }

  if (transactionsError || alertsError) {
    return serverError(
      "Failed to load dashboard data.",
      "DASHBOARD_LOAD_FAILED",
    ) as never;
  }

  const forecast = computeForecast(
    (transactions ?? []) as Transaction[],
    business.current_balance,
    30,
  );

  return NextResponse.json({
    business: {
      id: business.id,
      name: business.name,
      current_balance: business.current_balance,
      runway_days: business.runway_days,
      runway_severity: business.runway_severity,
    },
    alerts: (alerts ?? []) as Alert[],
    forecast_summary: {
      horizon_days: 30,
      min_projected_balance: forecast.minProjectedBalance,
      danger_dates: forecast.dangerDates,
      days: forecast.days,
    },
    upcoming_obligations: forecast.upcomingObligations,
  });
}
