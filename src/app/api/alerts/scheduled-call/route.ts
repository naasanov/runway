import { NextRequest, NextResponse } from 'next/server';
import { alertCall } from '@/scripts/alert-call';
import { badRequest, serverError } from '@/lib/errors';

const CALL_DELAY_MS = 10_000;

// Hardcoded for now — will be replaced with a dynamic message API call
const ALERT_MESSAGE =
  'Automated message from Runway. Your business cash runway needs attention. ' +
  'Please log in to your Runway dashboard to review your latest financial alerts.';

/**
 * POST /api/alerts/scheduled-call
 *
 * Waits CALL_DELAY_MS then places an ElevenLabs + Twilio voice call to the
 * given number with a pre-generated alert message.
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
    await alertCall(ALERT_MESSAGE, toNumber);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Scheduled alert call failed:', err);
    return serverError('Failed to place scheduled alert call', 'CALL_FAILED');
  }
}
