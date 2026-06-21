import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAuthConfigured, getAuthConfigError } from "@/lib/auth-secret";

export async function GET() {
  const configured = isAuthConfigured();

  if (!configured) {
    return NextResponse.json({
      authenticated: false,
      configured: false,
      error: getAuthConfigError(),
    });
  }

  const session = await getSession();
  return NextResponse.json({
    authenticated: !!session,
    configured: true,
  });
}
