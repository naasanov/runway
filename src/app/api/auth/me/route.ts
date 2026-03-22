import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { env } from "@/lib/env";
import { serverError } from "@/lib/errors";

/**
 * GET /api/auth/me
 *
 * Returns the current user's profile including data from Auth0 user_metadata
 * (name, business_name, phone set at signup).
 *
 * Responses:
 *   200  { name, businessName, phone }
 *   401  { error, code: "UNAUTHENTICATED" }
 *   500  { error, code: "SESSION_ERROR" }
 */
export async function GET() {
  let session;
  try {
    session = await getSession();
  } catch {
    return serverError("Failed to read session.", "SESSION_ERROR");
  }

  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated.", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  // Fallback: derive phone from the synthetic email ({digits}@runway.app)
  const digits = session.email.split("@")[0];
  let phone = `+${digits}`;
  let businessName: string | null = null;
  let name = session.name ?? null;

  // Fetch full profile from Auth0 Management API for user_metadata
  try {
    const tokenRes = await fetch(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: env.AUTH0_CLIENT_ID,
        client_secret: env.AUTH0_CLIENT_SECRET,
        audience: `https://${env.AUTH0_DOMAIN}/api/v2/`,
      }),
    });

    if (tokenRes.ok) {
      const { access_token } = (await tokenRes.json()) as { access_token: string };
      const userRes = await fetch(
        `https://${env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(session.sub)}`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      if (userRes.ok) {
        const user = (await userRes.json()) as {
          name?: string;
          user_metadata?: { name?: string; business_name?: string; phone?: string };
        };
        const meta = user.user_metadata;
        if (meta?.phone) phone = meta.phone;
        if (meta?.business_name) businessName = meta.business_name;
        if (meta?.name) name = meta.name;
      }
    }
  } catch {
    // Fall through — use session-derived values
  }

  return NextResponse.json({ name, businessName, phone });
}
