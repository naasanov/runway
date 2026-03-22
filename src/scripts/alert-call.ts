import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER!;
const ALERT_PHONE_NUMBER = process.env.ALERT_PHONE_NUMBER!;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL)!;

const AUDIO_DIR = path.join(process.cwd(), 'public', 'tmp_audio');

async function generateSpeech(message: string): Promise<string> {
  console.log(`🎙  Generating speech...`);

  const fullText = `Automated message from Runway: ${message}.`;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: fullText,
        model_id: 'eleven_turbo_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: 0.75 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs error: ${response.status} ${err}`);
  }

  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  const filename = `alert-${Date.now()}.mp3`;
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(path.join(AUDIO_DIR, filename), buffer);

  console.log(`✅ Audio saved: ${filename}`);
  return filename;
}

export async function alertCall(message: string, toNumber?: string): Promise<void> {
  const to = toNumber || ALERT_PHONE_NUMBER;
  const filename = await generateSpeech(message);
  const audioUrl = `${PUBLIC_BASE_URL}/tmp_audio/${filename}`;

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="2"/>
  <Play loop="2">${audioUrl}</Play>
</Response>`;

  // Verify the audio URL is reachable before placing the call
  const check = await fetch(audioUrl, { method: 'HEAD' });
  if (!check.ok) {
    throw new Error(`Audio URL not reachable (${check.status}): ${audioUrl}\nIs Next.js running with ngrok on the right port?`);
  }

  console.log(`📞 Calling ${to}...`);
  console.log(`   Audio URL: ${audioUrl}`);

  const call = await client.calls.create({
    to,
    from: TWILIO_FROM_NUMBER,
    twiml,
    machineDetection: 'DetectMessageEnd',
  });

  console.log(`✅ Call initiated! SID: ${call.sid} | Status: ${call.status}`);

  // Delete the file after 120s — enough time for Twilio to fetch and play it
  setTimeout(() => {
    fs.rmSync(path.join(AUDIO_DIR, filename), { force: true });
    console.log(`🗑  Deleted ${filename}`);
  }, 120_000).unref();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const message = process.argv[2] || 'Warning. Server alert triggered. Please check your systems immediately.';
  alertCall(message).catch((err) => {
    console.error('❌ Alert failed:', err);
    process.exit(1);
  });
}
