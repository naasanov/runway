import { loadDashboardData, DashboardDataError } from "@/lib/dashboard-data";
import { notFound, serverError } from "@/lib/errors";
import type { DashboardResponse } from "@/lib/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<DashboardResponse>> {
  const businessId = params.id;

  console.log(`[dashboard:${businessId}] start`);

  try {
    const payload = await loadDashboardData(businessId);

    console.log(`[dashboard:${businessId}] payload_summary`, {
      runway_days: payload.business.runway_days,
      runway_severity: payload.business.runway_severity,
      transaction_count: payload.forecast_summary.days.length,
      alert_count: payload.alerts.length,
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof DashboardDataError) {
      if (error.code === "BUSINESS_NOT_FOUND") {
        console.log(`[dashboard:${businessId}] business_not_found`);
        return notFound(error.message, error.code) as never;
      }

      console.error(`[dashboard:${businessId}] load_failed`, {
        code: error.code,
        message: error.message,
      });
      return serverError(error.message, error.code) as never;
    }

    console.error(`[dashboard:${businessId}] unexpected_error`, error);
    return serverError(
      "Failed to load dashboard data.",
      "DASHBOARD_LOAD_FAILED",
    ) as never;
  }
}
