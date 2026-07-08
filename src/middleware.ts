import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { ADMIN_COOKIE_NAME } from "@/lib/auth-secret";
import { getJwtSecretKey, isAuthConfigured } from "@/lib/auth-secret";

async function verifyAdminToken(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecretKey());
  const role = payload.role;
  // Legacy "admin" plus new role ladder
  const allowed = ["admin", "owner", "operator", "editor", "viewer"];
  if (typeof role !== "string" || !allowed.includes(role)) throw new Error("Invalid role");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (pathname.startsWith("/api/admin")) {
    // Vercel Blob posts upload-completed webhooks here with x-vercel-signature (no admin cookie).
    if (
      pathname === "/api/admin/upload/client" &&
      request.method === "POST" &&
      request.headers.get("x-vercel-signature")
    ) {
      return NextResponse.next();
    }

    if (!isAuthConfigured()) {
      return NextResponse.json(
        { error: "Server auth is not configured. Set AUTH_SECRET in environment variables." },
        { status: 503 }
      );
    }
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      await verifyAdminToken(token);
      return NextResponse.next();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  if (pathname === "/admin/login") {
    if (token && isAuthConfigured()) {
      try {
        await verifyAdminToken(token);
        return NextResponse.redirect(new URL("/admin", request.url));
      } catch {
        // Invalid token — show login form
      }
    }
    return NextResponse.next();
  }

  if (!isAuthConfigured()) {
    return NextResponse.redirect(new URL("/admin/login?error=config", request.url));
  }

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  try {
    await verifyAdminToken(token);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.set(ADMIN_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return response;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
