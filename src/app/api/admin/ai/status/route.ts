import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getProviderStatus } from "@/lib/ai/providers/registry";
import { isAIConfigured } from "@/lib/ai/config";
import { isOpenRouterConfigured, probeOpenRouterKey } from "@/lib/ai/providers/openrouter-client";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openrouterProbe = isOpenRouterConfigured() ? await probeOpenRouterKey() : null;

  return NextResponse.json({
    ...getProviderStatus(),
    enabled: isAIConfigured(),
    openrouter: openrouterProbe
      ? { configured: isOpenRouterConfigured(), keyValid: openrouterProbe.ok, error: openrouterProbe.error }
      : { configured: false, keyValid: false, error: "OPENROUTER_API_KEY not set" },
  });
}
