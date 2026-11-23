import type { NextResponse } from "next/server";
import { rejectIfCrossOrigin } from "@/lib/admin-request-guard";

/**
 * CSRF guard for seasonal mutations: accept requests whose Origin matches the
 * host that served them (works on www, apex, previews and any local port),
 * otherwise defer to the shared allowlist check.
 */
export function rejectIfNotSameSite(request: Request): NextResponse | null {
  if (request.headers.get("sec-fetch-site") === "same-origin") return null;
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host === host) return null;
    } catch {
      /* fall through */
    }
  }
  return rejectIfCrossOrigin(request);
}
