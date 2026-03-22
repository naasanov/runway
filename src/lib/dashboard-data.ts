import { computeForecast } from "@/lib/forecast";
import type { Alert, DashboardResponse, Transaction } from "@/lib/types";

export class DashboardDataError extends Error {
  constructor(
    message: string,
    public code: "BUSINESS_NOT_FOUND" | "DASHBOARD_LOAD_FAILED",
  ) {
    super(message);
    this.name = "DashboardDataError";
  }
}

export async function loadDashboardData(
  businessId: string,
): Promise<DashboardResponse> {
  const { supabase } = await import("@/lib/supabase");

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
    throw new DashboardDataError("Business not found.", "BUSINESS_NOT_FOUND");
  }

  if (transactionsError || alertsError) {
    throw new DashboardDataError(
      "Failed to load dashboard data.",
      "DASHBOARD_LOAD_FAILED",
    );
  }

  const forecast = computeForecast(
    (transactions ?? []) as Transaction[],
    business.current_balance,
    30,
  );

  return {
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
  };
}
