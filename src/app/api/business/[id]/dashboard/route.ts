import { notFound, serverError } from "@/lib/errors";
import { computeForecast } from "@/lib/forecast";
import type { Alert, DashboardResponse, Transaction } from "@/lib/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<DashboardResponse>> {
  const { supabase } = await import("@/lib/supabase");
  const businessId = params.id;

  console.log(`[dashboard:${businessId}] start`);

  const [
    { data: business, error: businessError },
    { data: transactions, error: transactionsError },
    { data: alerts, error: alertsError },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, current_balance, runway_days, runway_severity, owner_phone")
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
    console.log(`[dashboard:${businessId}] business_not_found`);
    return notFound("Business not found.", "BUSINESS_NOT_FOUND") as never;
  }

  if (transactionsError || alertsError) {
    console.error(`[dashboard:${businessId}] load_failed`, {
      transactionsError,
      alertsError,
    });
    return serverError(
      "Failed to load dashboard data.",
      "DASHBOARD_LOAD_FAILED"
    ) as never;
  }

  const forecast = computeForecast(
    (transactions ?? []) as Transaction[],
    business.current_balance,
    30
  );

  console.log(`[dashboard:${businessId}] payload_summary`, {
    runway_days: business.runway_days,
    runway_severity: business.runway_severity,
    transaction_count: (transactions ?? []).length,
    alert_count: (alerts ?? []).length,
  });

  return NextResponse.json({
    business: {
      id: business.id,
      name: business.name,
      current_balance: business.current_balance,
      runway_days: business.runway_days,
      runway_severity: business.runway_severity,
      owner_phone: business.owner_phone,
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
