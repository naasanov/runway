import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { setSessionCookie } from "@/lib/session";
import { badRequest, serverError } from "@/lib/errors";

/** Normalise a US phone number to E.164 (+1XXXXXXXXXX). */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+1${digits.slice(-10)}`;
}

export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    businessName?: string;
    phone?: string;
    password?: string;
  };

  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.", "INVALID_BODY");
  }

  const { name, businessName, phone, password } = body;

  if (!name || !businessName || !phone || !password) {
    return badRequest("All fields are required.", "MISSING_FIELDS");
  }

  const normalizedPhone = normalizePhone(phone);
  // Derive a stable email from the phone number for Auth0 (user never sees this)
  const email = `${normalizedPhone.replace("+", "")}@runway.app`;
  const domain = env.AUTH0_DOMAIN;
  const clientId = env.AUTH0_CLIENT_ID;
  const clientSecret = env.AUTH0_CLIENT_SECRET;

  // ── Step 1: Create user in Auth0 Database Connection ──────────────────────
  const signupRes = await fetch(
    `https://${domain}/dbconnections/signup`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        email,
        password,
        connection: "Username-Password-Authentication",
        name,
        user_metadata: {
          name,
          business_name: businessName,
          phone: normalizedPhone,
        },
      }),
    }
  );

  if (!signupRes.ok) {
    const error = await signupRes.json().catch(() => ({}));
    const message: string =
      (error as { message?: string; description?: string }).message ??
      (error as { message?: string; description?: string }).description ??
      "Failed to create account.";
    return NextResponse.json({ error: message }, { status: signupRes.status });
  }

  // ── Step 2: Log the user in via ROPC to get a session token ───────────────
  const tokenRes = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "password",
      username: email,
      password,
      scope: "openid profile email",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    // Account was created — send them to login manually
    return NextResponse.json({ redirect: "/login" }, { status: 200 });
  }

  const tokens = await tokenRes.json() as { id_token?: string };
  if (!tokens.id_token) {
    return serverError("Auth token missing.", "TOKEN_MISSING");
  }

  const response = NextResponse.json({ redirect: "/connect" }, { status: 200 });
  setSessionCookie(response, tokens.id_token);
  return response;
}
