import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { serverError } from "@/lib/errors";

/**
 * GET /api/auth/me
 *
 * Returns the current user's profile. Phone and businessName are read from
 * cookies set at signup. The user's name comes from the JWT id_token.
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

  const cookieStore = await cookies();

  // Phone: from cookie (set at signup), or derived from email ({digits}@runway.app)
  const phoneCookie = cookieStore.get("runway_phone")?.value;
  const digits = session.email.split("@")[0];
  const phone = phoneCookie || `+${digits}`;

  // Business name: from cookie (set at signup)
  const businessName = cookieStore.get("runway_business_name")?.value ?? null;

  const name = session.name ?? null;

  return NextResponse.json({ name, businessName, phone });
}
