import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string(),
  GEMINI_MODEL: z.string(),
  AZURE_COMMUNICATION_CONNECTION_STRING: z.string(),
  AZURE_SMS_FROM_NUMBER: z.string(),
  NEXT_PUBLIC_SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  NEXT_PUBLIC_BASE_URL: z.string().optional(),
  ELEVENLABS_API_KEY: z.string(),
  ELEVENLABS_VOICE_ID: z.string().default('21m00Tcm4TlvDq8ikWAM'),
  ELEVENLABS_VOICE_ID_LIGHT: z.string().default('21m00Tcm4TlvDq8ikWAM'),
  ELEVENLABS_VOICE_ID_MEDIUM: z.string().default('21m00Tcm4TlvDq8ikWAM'),
  ELEVENLABS_VOICE_ID_HEAVY: z.string().default('21m00Tcm4TlvDq8ikWAM'),
  TWILIO_ACCOUNT_SID: z.string(),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_FROM_NUMBER: z.string(),
  ALERT_PHONE_NUMBER: z.string(),
  AUTH0_DOMAIN: z.string(),
  AUTH0_CLIENT_ID: z.string(),
  AUTH0_CLIENT_SECRET: z.string(),
});

type Env = z.infer<typeof envSchema>;

const cache = new Map<string, unknown>();
const shape = envSchema.shape;

export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    if (cache.has(prop)) return cache.get(prop);

    if (!(prop in shape)) {
      throw new Error(
        `\n\nUnknown environment variable "${prop}". Add it to the schema in src/lib/env.ts first.\n`
      );
    }

    const fieldSchema = shape[prop as keyof typeof shape];
    const result = fieldSchema.safeParse(process.env[prop]);

    if (!result.success) {
      const issue = result.error.issues[0];
      throw new Error(
        `\n\nMissing or invalid environment variable "${prop}": ${issue.message}\n\nMake sure it is set in your .env.local file.\n`
      );
    }

    cache.set(prop, result.data);
    return result.data;
  },
});
