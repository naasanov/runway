import { NextRequest, NextResponse } from 'next/server';
import { alertCall } from '@/scripts/alert-call';
import { badRequest, serverError } from '@/lib/errors';

/**
 * POST /api/alerts/call
 *
 * Triggers an automated phone call using ElevenLabs TTS + Twilio.
 * The message is synthesized to audio, hosted temporarily, and played to the recipient.
 *
 * Request body:
 *   message  {string}  Required. The text to speak during the call.
 *   toNumber {string}  Optional. E.164 phone number to call (e.g. "+15550001234").
 *                      Defaults to ALERT_PHONE_NUMBER (arya's phone) from env.
 *
 * Responses:
 *   200  { success: true }
 *   400  { error, code: "MISSING_MESSAGE" }
 *   500  { error, code: "CALL_FAILED" }
 *
 * Note: Requires NEXT_PUBLIC_BASE_URL to be set to the publicly reachable
 * app URL so Twilio can fetch the generated audio file.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message: string = body?.message;
  const toNumber: string | undefined = body?.toNumber;

  if (!message) return badRequest('message is required', 'MISSING_MESSAGE');

  try {
    await alertCall(message, toNumber);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Alert call failed:', err);
    return serverError('Failed to trigger alert call', 'CALL_FAILED');
  }
}
