/**
 * Minimal CSRF-style origin check + rate limit for high-risk mutating admin AI routes.
 * Cookie auth alone is not enough against cross-site POST from a logged-in browser.
 */

import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function allowedOrigins(): Set<string> {
  const origins = new Set<string>();
  const add = (raw: string | undefined) => {
    if (!raw?.trim()) return;
    try {
      origins.add(new URL(raw).origin);
    } catch {
      /* ignore invalid */
    }
  };
  add(process.env.NEXT_PUBLIC_SITE_URL);
  add(process.env.SITE_URL);
  add(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  add(process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined);
  // Local / preview defaults
  origins.add("http://localhost:3000");
  origins.add("http://127.0.0.1:3000");
  return origins;
}

/** Returns null when the request looks same-origin; otherwise a 403 response. */
export function rejectIfCrossOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowed = allowedOrigins();

  // Same-origin browser fetches always send Origin on POST. Missing Origin is
  // allowed for server-to-server / curl with admin session (still requireAdmin).
  if (!origin && !referer) return null;

  if (origin) {
    if (allowed.has(origin)) return null;
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (allowed.has(refOrigin)) return null;
    } catch {
      /* fall through */
    }
    return NextResponse.json({ error: "Forbidden referer" }, { status: 403 });
  }

  return null;
}

/**
 * Origin check + per-IP rate limit for mutating admin AI endpoints.
 * Call after requireAdmin (or before — either order is fine).
 */
export async function guardMutatingAdminAi(
  request: Request,
  routeKey: string
): Promise<NextResponse | null> {
  const cross = rejectIfCrossOrigin(request);
  if (cross) return cross;

  const ip = getClientIp(request);
  const limited = await checkRateLimit(ip, routeKey);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }
  return null;
}
