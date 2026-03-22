import { NextRequest, NextResponse } from 'next/server';
import { alertCall } from '@/scripts/alert-call';
import { getAlertMessage } from '@/lib/alert-message';
import type { AlertSentiment } from '@/lib/alert-message';
import { env } from '@/lib/env';
import { badRequest, serverError } from '@/lib/errors';

const CALL_DELAY_MS = 10_000;

/** Map sentiment to the corresponding ElevenLabs voice ID. */
function voiceForSentiment(sentiment: AlertSentiment): string {
  switch (sentiment) {
    case 'heavy': return env.ELEVENLABS_VOICE_ID_HEAVY;
    case 'medium': return env.ELEVENLABS_VOICE_ID_MEDIUM;
    case 'light': return env.ELEVENLABS_VOICE_ID_LIGHT;
    default: return env.ELEVENLABS_VOICE_ID;
  }
}

/**
 * POST /api/alerts/scheduled-call
 *
 * Waits CALL_DELAY_MS, fetches the alert message and sentiment from
 * getAlertMessage(), selects the appropriate ElevenLabs voice, then
 * places a Twilio voice call to the given number.
 *
 * Request body:
 *   toNumber {string}  Required. E.164 phone number to call (e.g. "+15550001234").
 *
 * Responses:
 *   200  { success: true, sentiment: "light" | "medium" | "heavy" }
 *   400  { error, code: "MISSING_PHONE" }
 *   500  { error, code: "CALL_FAILED" }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const toNumber: string = body?.toNumber;

  if (!toNumber) return badRequest('toNumber is required', 'MISSING_PHONE');

  await new Promise((resolve) => setTimeout(resolve, CALL_DELAY_MS));

  try {
    const { message, sentiment } = await getAlertMessage();
    const voiceId = voiceForSentiment(sentiment);
    console.log(`Alert sentiment: ${sentiment}, voice: ${voiceId}`);

    await alertCall(message, toNumber, voiceId);
    return NextResponse.json({ success: true, sentiment });
  } catch (err) {
    console.error('Scheduled alert call failed:', err);
    return serverError('Failed to place scheduled alert call', 'CALL_FAILED');
  }
}
