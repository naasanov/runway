import { NextRequest, NextResponse } from 'next/server';
import { alertCall } from '@/scripts/alert-call';
import { env } from '@/lib/env';
import { badRequest, serverError } from '@/lib/errors';

const CALL_DELAY_MS = 10_000;
const FALLBACK_MESSAGE =
  'Your business cash runway needs attention. ' +
  'Please log in to your Runway dashboard to review your latest financial alerts.';

// Keywords that signal severity level — checked against the message text
const HEAVY_KEYWORDS = [
  'critical', 'urgent', 'immediately', 'emergency', 'danger',
  'negative', 'overdue', 'bankrupt', 'zero', 'run out',
];
const MEDIUM_KEYWORDS = [
  'attention', 'warning', 'review', 'declining', 'below',
  'low', 'concern', 'action required', 'alert',
];

type VoiceSeverity = 'light' | 'medium' | 'heavy';

/** Classify a message as light, medium, or heavy based on keyword analysis. */
function classifySeverity(message: string): VoiceSeverity {
  const lower = message.toLowerCase();
  if (HEAVY_KEYWORDS.some((kw) => lower.includes(kw))) return 'heavy';
  if (MEDIUM_KEYWORDS.some((kw) => lower.includes(kw))) return 'medium';
  return 'light';
}

/** Map severity to the corresponding ElevenLabs voice ID. */
function voiceForSeverity(severity: VoiceSeverity): string {
  switch (severity) {
    case 'heavy': return env.ELEVENLABS_VOICE_ID_HEAVY;
    case 'medium': return env.ELEVENLABS_VOICE_ID_MEDIUM;
    case 'light': return env.ELEVENLABS_VOICE_ID_LIGHT;
  }
}

/**
 * POST /api/alerts/scheduled-call
 *
 * Waits CALL_DELAY_MS, fetches the alert message from GET /api/alerts/message,
 * classifies its severity, selects the appropriate ElevenLabs voice, then
 * places a Twilio voice call to the given number.
 *
 * Request body:
 *   toNumber {string}  Required. E.164 phone number to call (e.g. "+15550001234").
 *
 * Responses:
 *   200  { success: true, severity: "light" | "medium" | "heavy" }
 *   400  { error, code: "MISSING_PHONE" }
 *   500  { error, code: "CALL_FAILED" }
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

    // Pick voice based on message severity
    const severity = classifySeverity(message);
    const voiceId = voiceForSeverity(severity);
    console.log(`Alert severity: ${severity}, voice: ${voiceId}`);

    await alertCall(message, toNumber, voiceId);
    return NextResponse.json({ success: true, severity });
  } catch (err) {
    console.error('Scheduled alert call failed:', err);
    return serverError('Failed to place scheduled alert call', 'CALL_FAILED');
  }
}
