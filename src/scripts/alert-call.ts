import twilio from 'twilio';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

const AUDIO_BUCKET = env.SUPABASE_ALERT_AUDIO_BUCKET;

async function generateSpeech(message: string, voiceId?: string): Promise<Buffer> {
  console.log(`🎙  Generating speech...`);

  const fullText = `Automated message from Runway: ${message}.`;
  const voice = voiceId || env.ELEVENLABS_VOICE_ID;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': env.ELEVENLABS_API_KEY,
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

  return Buffer.from(await response.arrayBuffer());
}

async function uploadAudio(buffer: Buffer): Promise<{ path: string; url: string }> {
  const filename = `alert-${Date.now()}-${crypto.randomUUID()}.mp3`;
  const filePath = `calls/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(filePath, buffer, {
      contentType: 'audio/mpeg',
      cacheControl: '600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Supabase upload failed: ${uploadError.message}`);
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(filePath, 60 * 15);

  if (signedUrlError || !data?.signedUrl) {
    throw new Error(
      `Supabase signed URL failed: ${signedUrlError?.message || 'Missing signed URL'}`
    );
  }

  console.log(`✅ Audio uploaded: ${filePath}`);
  return { path: filePath, url: data.signedUrl };
}

export async function alertCall(message: string, toNumber?: string, voiceId?: string): Promise<void> {
  const to = toNumber || env.ALERT_PHONE_NUMBER;
  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

  let twiml: string;
  let audioPath: string | null = null;

  try {
    const audioBuffer = await generateSpeech(message, voiceId);
    const { path, url: audioUrl } = await uploadAudio(audioBuffer);
    audioPath = path;
    console.log(`   Audio URL: ${audioUrl}`);
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="2"/>
  <Play loop="2">${audioUrl}</Play>
</Response>`;
  } catch (err) {
    console.error('⚠️  Audio generation failed, using fallback:', err);
    const fallbackUrl = env.FALLBACK_AUDIO_URL;
    twiml = fallbackUrl
      ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="2"/>
  <Play loop="2">${fallbackUrl}</Play>
</Response>`
      : `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="2"/>
  <Say loop="2">Automated message from Runway: ${message}</Say>
</Response>`;
  }

  console.log(`📞 Calling ${to}...`);

  const call = await client.calls.create({
    to,
    from: env.TWILIO_FROM_NUMBER,
    twiml,
    machineDetection: 'DetectMessageEnd',
  });

  console.log(`✅ Call initiated! SID: ${call.sid} | Status: ${call.status}`);

  // Best-effort cleanup after Twilio has had time to fetch and play the recording.
  // 10 minutes: accounts for machine detection (~30s) + voicemail greeting (~20s) + double play (~60s).
  if (audioPath) {
    const cleanupTimer = setTimeout(async () => {
      const { error } = await supabase.storage.from(AUDIO_BUCKET).remove([audioPath!]);
      if (error) {
        console.error(`Failed to delete uploaded audio ${audioPath}:`, error.message);
        return;
      }
      console.log(`🗑  Deleted ${audioPath}`);
    }, 600_000);
    cleanupTimer.unref?.();
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  const message = process.argv[2] || 'Warning. Server alert triggered. Please check your systems immediately.';
  alertCall(message).catch((err) => {
    console.error('❌ Alert failed:', err);
    process.exit(1);
  });
}
