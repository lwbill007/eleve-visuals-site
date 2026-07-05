import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getIntelligenceAutomationSettings,
  setIntelligenceAutomationSettings,
  getAutomationOptions,
} from "@/lib/ai/memory/knowledge/automation";
import type { RefreshTrigger } from "@/lib/ai/memory/knowledge/types";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getIntelligenceAutomationSettings();
  return NextResponse.json({
    settings,
    options: getAutomationOptions(settings),
  });
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { enabled, schedules } = body as {
    enabled?: boolean;
    schedules?: RefreshTrigger[];
  };

  const settings = await setIntelligenceAutomationSettings({
    ...(enabled !== undefined ? { enabled } : {}),
    ...(schedules ? { schedules } : {}),
  });

  return NextResponse.json({
    settings,
    options: getAutomationOptions(settings),
  });
}
