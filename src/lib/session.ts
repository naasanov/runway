import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "runway_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  sub: string;
  email: string;
  name?: string;
}

/** Decode the id_token JWT payload without verifying the signature. */
function decodeIdToken(idToken: string): SessionUser | null {
  try {
    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64url").toString("utf-8")
    );
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return { sub: payload.sub, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

/** Read the current session from cookies. Returns null if missing or expired. */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeIdToken(token);
}

/** Attach the session cookie to a NextResponse. */
export function setSessionCookie(response: NextResponse, idToken: string) {
  response.cookies.set(COOKIE_NAME, idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/** Clear the session cookie on a NextResponse. */
export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
}
