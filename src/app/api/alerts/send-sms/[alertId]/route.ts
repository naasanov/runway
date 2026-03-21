import { NextResponse } from "next/server";
import type { SendSmsResponse } from "@/lib/types";

// TODO: implement — Dev 4 owns this
export async function POST(): Promise<NextResponse<SendSmsResponse>> {
  return NextResponse.json({
    alert_id: "alert-0092",
    sms_sent: true,
    sms_sent_at: "2026-03-21T18:30:00Z",
    to: "+19195551234",
    message_preview:
      "Runway Alert for Sweet Grace Bakery: Durham Catering Co owes $3,200 and is 12 days overdue. Open dashboard: https://runway.vercel.app/dashboard/biz-sweet-grace-001",
  });
}
