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
    console.log("[me] fetching Auth0 management token...");
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

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[me] Auth0 token request failed:", tokenRes.status, errBody);
    } else {
      const { access_token } = (await tokenRes.json()) as { access_token: string };
      console.log("[me] got management token, fetching user:", session.sub);

      const userRes = await fetch(
        `https://${env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(session.sub)}`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      if (!userRes.ok) {
        const errBody = await userRes.text();
        console.error("[me] Auth0 user fetch failed:", userRes.status, errBody);
      } else {
        const user = (await userRes.json()) as {
          name?: string;
          user_metadata?: { name?: string; business_name?: string; phone?: string };
        };
        console.log("[me] Auth0 user_metadata:", JSON.stringify(user.user_metadata));
        console.log("[me] Auth0 user name:", user.name);
        const meta = user.user_metadata;
        if (meta?.phone) phone = meta.phone;
        if (meta?.business_name) businessName = meta.business_name;
        if (meta?.name) name = meta.name;
      }
    }
  } catch (err) {
    console.error("[me] Auth0 Management API error:", err);
  }

  return NextResponse.json({ name, businessName, phone });
}
