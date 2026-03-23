import { NextRequest, NextResponse } from 'next/server';
import { alertCall } from '@/scripts/alert-call';
import { badRequest, serverError } from '@/lib/errors';

/**
 * POST /api/alerts/call
 *
 * Triggers an automated phone call using ElevenLabs TTS + Twilio.
 * The message is synthesized to audio, uploaded to Supabase Storage,
 * and played to the recipient via a signed URL.
 *
 * Request body:
 *   message  {string}  Required. The text to speak during the call.
 *   toNumber {string}  Optional. E.164 phone number to call (e.g. "+15550001234").
 *                      Defaults to ALERT_PHONE_NUMBER (arya's phone) from env.
 *   voiceId  {string}  Optional. ElevenLabs voice ID to use for TTS.
 *
 * Responses:
 *   200  { success: true }
 *   400  { error, code: "MISSING_MESSAGE" }
 *   500  { error, code: "CALL_FAILED" }
 *
 * Note: Requires SUPABASE_ALERT_AUDIO_BUCKET to point at a bucket the server
 * can upload into so Twilio can fetch the generated audio file via signed URL.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message: string = body?.message;
  const toNumber: string | undefined = body?.toNumber;
  const voiceId: string | undefined = body?.voiceId;

  if (!message) return badRequest('message is required', 'MISSING_MESSAGE');

  try {
    await alertCall(message, toNumber, voiceId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Alert call failed:', err);
    return serverError('Failed to trigger alert call', 'CALL_FAILED');
  }
}
