import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAuthConfigured } from "@/lib/auth-secret";

export async function GET() {
  const configured = isAuthConfigured() && !!process.env.ADMIN_PASSWORD;

  if (!configured) {
    return NextResponse.json({
      authenticated: false,
      configured: false,
    });
  }

  const session = await getSession();
  return NextResponse.json({
    authenticated: !!session,
    configured: true,
  });
}
