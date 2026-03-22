import { NextRequest, NextResponse } from "next/server";
import type { Alert, AlertsResponse, Severity } from "@/lib/types";
import { SEVERITIES } from "@/lib/types";
import { notFound, serverError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<AlertsResponse>> {
  const { supabase } = await import("@/lib/supabase");
  const businessId = params.id;

  // Verify business exists
  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .single();

  if (bizErr || !business) {
    return notFound("Business not found.", "BUSINESS_NOT_FOUND") as never;
  }

  // Parse optional severity filter
  const severityParam = req.nextUrl.searchParams.get("severity") as Severity | null;
  if (severityParam && !SEVERITIES.includes(severityParam)) {
    return notFound("Invalid severity filter.", "INVALID_SEVERITY") as never;
  }

  // Query alerts ordered by severity (red first)
  let query = supabase
    .from("alerts")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (severityParam) {
    query = query.eq("severity", severityParam);
  }

  const { data: alerts, error: alertErr } = await query;

  if (alertErr) {
    return serverError("Failed to fetch alerts.", "DB_QUERY_FAILED") as never;
  }

  // Sort: red first, then amber, then green
  const severityOrder: Record<string, number> = { red: 0, amber: 1, green: 2 };
  const sorted = ((alerts ?? []) as Alert[]).sort(
    (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
  );

  return NextResponse.json({
    business_id: businessId,
    alerts: sorted,
  });
}
