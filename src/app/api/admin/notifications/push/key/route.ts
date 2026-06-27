import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPushProvider } from "@/lib/notifications";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = getPushProvider();
  return NextResponse.json({
    configured: provider.isConfigured(),
    publicKey: provider.getPublicKey(),
  });
}
