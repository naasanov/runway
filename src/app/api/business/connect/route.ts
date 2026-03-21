import { NextResponse } from "next/server";
import type { ConnectResponse } from "@/lib/types";

// TODO: implement — Dev 1 owns this
export async function POST(): Promise<NextResponse<ConnectResponse>> {
  return NextResponse.json(
    {
      business: {
        id: "biz-sweet-grace-001",
        name: "Sweet Grace Bakery",
        type: "bakery",
        owner_phone: "+19195551234",
        stripe_connected: true,
        banking_connected: true,
        current_balance: 4847.23,
        runway_days: null,
        runway_severity: null,
        created_at: "2026-03-22T15:00:00Z",
      },
      transactions_imported: 400,
    },
    { status: 201 }
  );
}
