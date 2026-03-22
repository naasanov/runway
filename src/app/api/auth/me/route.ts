import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { serverError } from "@/lib/errors";

/**
 * GET /api/auth/me
 *
 * Returns the current user's profile derived from their session cookie.
 * The phone number is extracted from the session email, which is stored in
 * the format `{digits}@runway.app` (e.g. "12485551234@runway.app" → "+12485551234").
 *
 * Responses:
 *   200  { name, phone }
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

  // Email format: "{digits}@runway.app" — digits are the E.164 number minus the "+"
  const digits = session.email.split("@")[0];
  const phone = `+${digits}`;

  return NextResponse.json({ name: session.name ?? null, phone });
}
