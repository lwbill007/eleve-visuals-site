import { NextResponse } from "next/server";
import { cookies, draftMode } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { SEASONAL_PREVIEW_COOKIE } from "@/lib/seasonal/server";

export const dynamic = "force-dynamic";

/** Same-site path only. Preview targets public pages; exiting may return to the admin. */
function safePath(value: string | null, allowAdmin = false): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  if (value.startsWith("/admin") && !allowAdmin) return "/";
  return value;
}

/**
 * Admin-only preview of the DRAFT seasonal config, in this browser only.
 *   /api/admin/seasonal/preview?mode=campaign&path=/
 *   /api/admin/seasonal/preview?mode=default&path=/
 *   /api/admin/seasonal/preview?exit=1
 * Uses Next.js draft mode, so cached public pages are never altered.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const draft = await draftMode();
  const jar = await cookies();
  const exiting = Boolean(url.searchParams.get("exit"));
  const path = safePath(url.searchParams.get("path"), exiting);

  if (exiting) {
    draft.disable();
    jar.delete(SEASONAL_PREVIEW_COOKIE);
    return NextResponse.redirect(new URL(path, url.origin));
  }

  const mode = url.searchParams.get("mode") === "campaign" ? "campaign" : "default";
  draft.enable();
  jar.set(SEASONAL_PREVIEW_COOKIE, mode, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  return NextResponse.redirect(new URL(path, url.origin));
}
