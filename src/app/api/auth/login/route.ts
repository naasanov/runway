import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { setSessionCookie } from "@/lib/session";
import { badRequest } from "@/lib/errors";

/** Normalise a US phone number to E.164 (+1XXXXXXXXXX). */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+1${digits.slice(-10)}`;
}

export async function POST(req: NextRequest) {
  let body: { phone?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.", "INVALID_BODY");
  }

  const { phone, password } = body;
  if (!phone || !password) {
    return badRequest("Phone and password are required.", "MISSING_FIELDS");
  }

  const normalizedPhone = normalizePhone(phone);
  // Derive the same email used at signup
  const email = `${normalizedPhone.replace("+", "")}@runway.app`;

  const tokenRes = await fetch(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "password",
      username: email,
      password,
      scope: "openid profile email",
      client_id: env.AUTH0_CLIENT_ID,
      client_secret: env.AUTH0_CLIENT_SECRET,
    }),
  });

  if (!tokenRes.ok) {
    const error = await tokenRes.json().catch(() => ({}));
    const message: string =
      (error as { error_description?: string }).error_description ??
      "Invalid phone number or password.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const tokens = (await tokenRes.json()) as { id_token?: string };
  if (!tokens.id_token) {
    return NextResponse.json({ error: "Auth token missing." }, { status: 500 });
  }

  const response = NextResponse.json({ redirect: "/connect" }, { status: 200 });
  setSessionCookie(response, tokens.id_token);
  return response;
}
