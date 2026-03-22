import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { env } from '@/lib/env';
import { badRequest, serverError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const message: string = body?.message;

  if (!message) return badRequest('message is required');

  try {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="2"/>
  <Say voice="Polly.Joanna" loop="2">${message}</Say>
</Response>`;

    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    const call = await client.calls.create({
      to: env.ALERT_PHONE_NUMBER,
      from: env.TWILIO_FROM_NUMBER,
      twiml,
    });

    return NextResponse.json({ success: true, callSid: call.sid });
  } catch (err) {
    console.error('Alert call failed:', err);
    return serverError('Failed to trigger alert call');
  }
}
