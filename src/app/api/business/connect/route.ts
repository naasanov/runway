import { NextRequest, NextResponse } from "next/server";
import type { ConnectRequest, ConnectResponse } from "@/lib/types";
import { badRequest, serverError } from "@/lib/errors";
import {
  generateAllTransactions,
  generateConcentrationTransactions,
} from "@/lib/seed-data";

// Dev 1 — D1-02/03: Pulls seed data, writes to DB, returns initialized business record.
// Called when the user clicks "Connect Stripe" in the UI.
export async function POST(
  req: NextRequest
): Promise<NextResponse<ConnectResponse>> {
  // Dynamic import keeps supabase out of the module-level scope so Next.js
  // doesn't try to instantiate the client during static build analysis.
  const { supabase } = await import("@/lib/supabase");

  let body: Partial<ConnectRequest>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.", "INVALID_BODY") as never;
  }

  const {
    business_name,
    business_type,
    owner_phone,
    stripe_account_id,
  } = body;

  const isConcentrationScenario = stripe_account_id === "77777777";
  const resolvedBusinessName = business_name;
  const resolvedBusinessType =
    business_type ?? (isConcentrationScenario ? "agency" : "bakery");

  if (!resolvedBusinessName || !owner_phone) {
    return badRequest(
      "business_name and owner_phone are required.",
      "MISSING_FIELDS"
    ) as never;
  }

  // Normalise phone to E.164 (+1XXXXXXXXXX)
  const phone = owner_phone.startsWith("+")
    ? owner_phone
    : `+1${owner_phone.replace(/\D/g, "")}`;

  // Generate a stable text ID (easier to read in the DB than a UUID)
  const businessId = `biz-${Date.now()}`;

  // ── Insert business record ────────────────────────────────────────────────
  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .insert({
      id: businessId,
      name: resolvedBusinessName,
      type: resolvedBusinessType,
      owner_phone: phone,
      stripe_connected: false,
      banking_connected: false,
      current_balance: 0,
    })
    .select()
    .single();

  if (bizErr || !business) {
    console.error("Business insert failed:", bizErr);
    return serverError(
      "Failed to create business record.",
      "DB_INSERT_FAILED"
    ) as never;
  }

  // ── Generate and insert seed transactions ─────────────────────────────────
  const { allTxns, account } = isConcentrationScenario
    ? generateConcentrationTransactions(businessId)
    : generateAllTransactions(businessId);

  // Strip categorization fields — these get populated by /analyze (Gemini AI)
  const uncategorized = allTxns.map((t) => ({
    ...t,
    category: null,
    is_recurring: false,
    recurrence_pattern: null,
  }));

  // Supabase insert limit is ~1000 rows; chunk in batches of 500 to be safe
  const CHUNK = 500;
  for (let i = 0; i < uncategorized.length; i += CHUNK) {
    const chunk = uncategorized.slice(i, i + CHUNK);
    const { error: txnErr } = await supabase.from("transactions").insert(chunk);
    if (txnErr) {
      console.error("Transaction insert failed:", txnErr);
      // Clean up orphaned business record
      await supabase.from("businesses").delete().eq("id", businessId);
      return serverError(
        "Failed to import transactions.",
        "DB_INSERT_FAILED"
      ) as never;
    }
  }

  // ── Update business: mark connected, set current balance ─────────────────
  const { data: updated, error: updateErr } = await supabase
    .from("businesses")
    .update({
      stripe_connected: true,
      banking_connected: true,
      current_balance: account.current_balance,
    })
    .eq("id", businessId)
    .select()
    .single();

  if (updateErr || !updated) {
    console.error("Business update failed:", updateErr);
  }

  return NextResponse.json(
    {
      business: updated ?? business,
      transactions_imported: uncategorized.length,
    },
    { status: 201 }
  );
}
