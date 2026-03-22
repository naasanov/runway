import { NextRequest, NextResponse } from 'next/server';
import { alertCall } from '@/scripts/alert-call';
import { badRequest, serverError } from '@/lib/errors';

const CALL_DELAY_MS = 10_000;
const FALLBACK_MESSAGE =
  'Your business cash runway needs attention. ' +
  'Please log in to your Runway dashboard to review your latest financial alerts.';

/**
 * POST /api/alerts/scheduled-call
 *
 * Waits CALL_DELAY_MS, fetches the alert message from GET /api/alerts/message,
 * then places an ElevenLabs + Twilio voice call to the given number.
 *
 * Request body:
 *   toNumber {string}  Required. E.164 phone number to call (e.g. "+15550001234").
 *
 * Responses:
 *   200  { success: true }
 *   400  { error, code: "MISSING_PHONE" }
 *   500  { error, code: "CALL_FAILED" }
 *
 * Note: Requires NEXT_PUBLIC_BASE_URL to be set to the publicly reachable
 * app URL so Twilio can fetch the generated audio file.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const toNumber: string = body?.toNumber;

  if (!toNumber) return badRequest('toNumber is required', 'MISSING_PHONE');

  await new Promise((resolve) => setTimeout(resolve, CALL_DELAY_MS));

  try {
    // Fetch the message from the message API
    const origin = req.nextUrl.origin;
    const msgRes = await fetch(`${origin}/api/alerts/message`);
    let message = FALLBACK_MESSAGE;
    if (msgRes.ok) {
      const msgBody = (await msgRes.json()) as { message?: string };
      if (msgBody.message) message = msgBody.message;
    }

    await alertCall(message, toNumber);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Scheduled alert call failed:', err);
    return serverError('Failed to place scheduled alert call', 'CALL_FAILED');
  }
}
