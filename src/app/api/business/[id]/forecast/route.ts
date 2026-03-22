import { NextRequest, NextResponse } from "next/server";
import type { ForecastResponse, Transaction } from "@/lib/types";
import { badRequest, notFound, serverError } from "@/lib/errors";
import {
  computeForecast,
  isValidForecastHorizon,
  VALID_HORIZONS,
} from "@/lib/forecast";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ForecastResponse>> {
  const { supabase } = await import("@/lib/supabase");
  const businessId = params.id;

  // Parse horizon query param
  const horizonParam = req.nextUrl.searchParams.get("horizon");
  const horizon = horizonParam ? parseInt(horizonParam, 10) : 30;
  if (!isValidForecastHorizon(horizon)) {
    return badRequest(
      `horizon must be one of: ${VALID_HORIZONS.join(", ")}`,
      "INVALID_HORIZON"
    ) as never;
  }

  // Fetch business
  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("id, current_balance")
    .eq("id", businessId)
    .single();

  if (bizErr || !business) {
    return notFound("Business not found.", "BUSINESS_NOT_FOUND") as never;
  }

  // Fetch all categorized transactions
  const { data: transactions, error: txnErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("business_id", businessId);

  if (txnErr) {
    return serverError(
      "Failed to fetch transactions.",
      "DB_QUERY_FAILED"
    ) as never;
  }

  const txns = (transactions ?? []) as Transaction[];
  const forecast = computeForecast(txns, business.current_balance, horizon);

  const { error: updateError } = await supabase
    .from("businesses")
    .update({
      runway_days: forecast.runwayDays,
      runway_severity: forecast.runwaySeverity,
    })
    .eq("id", businessId);

  if (updateError) {
    return serverError(
      "Failed to persist runway metrics.",
      "RUNWAY_UPDATE_FAILED",
    ) as never;
  }

  return NextResponse.json({
    business_id: businessId,
    generated_at: new Date().toISOString(),
    horizon_days: horizon,
    current_balance: business.current_balance,
    avg_daily_net_burn: forecast.avgDailyNetBurn,
    runway_days: forecast.runwayDays,
    first_negative_date: forecast.firstNegativeDate,
    days: forecast.days,
  });
}
