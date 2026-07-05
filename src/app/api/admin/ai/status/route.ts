import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getProviderStatus } from "@/lib/ai/providers/registry";
import { isAIConfigured } from "@/lib/ai/config";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ...getProviderStatus(),
    enabled: isAIConfigured(),
  });
}
