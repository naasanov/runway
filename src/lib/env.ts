import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string(),
  GEMINI_MODEL: z.string(),
  AZURE_COMMUNICATION_CONNECTION_STRING: z.string(),
  AZURE_SMS_FROM_NUMBER: z.string(),
  NEXT_PUBLIC_SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  NEXT_PUBLIC_BASE_URL: z.string().optional(),
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

    // Backward compatibility: allow legacy Supabase key naming used in some setups.
    if (prop === "SUPABASE_SERVICE_ROLE_KEY") {
      const resolvedKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY;
      const result = shape.SUPABASE_SERVICE_ROLE_KEY.safeParse(resolvedKey);

      if (!result.success) {
        const issue = result.error.issues[0];
        throw new Error(
          `\n\nMissing or invalid environment variable "${prop}": ${issue.message}\n\nSet SUPABASE_SERVICE_ROLE_KEY in .env.local (preferred).\nIf your project still uses NEXT_PUBLIC_SUPABASE_SECRET_KEY, this code will also accept it as a fallback.\n`
        );
      }

      cache.set(prop, result.data);
      return result.data;
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
