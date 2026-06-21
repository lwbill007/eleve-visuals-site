import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { isAuthConfigured } from "@/lib/auth-secret";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Admin login is not configured. Set AUTH_SECRET (32+ chars) and ADMIN_PASSWORD in environment variables.",
      },
      { status: 503 }
    );
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not configured on the server." },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(ip, "auth:login");
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSec) },
      }
    );
  }

  try {
    const { password } = await request.json();
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const valid = await verifyPassword(password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    await createSession();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
