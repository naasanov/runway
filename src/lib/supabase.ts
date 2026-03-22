import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: {
    fetch: (input, init) =>
      fetch(input, {
        ...init,
        cache: "no-store",
      }),
  },
});
