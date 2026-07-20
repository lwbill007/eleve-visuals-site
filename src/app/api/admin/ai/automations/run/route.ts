import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  runAllSystemAutomations,
  runSystemAutomation,
  SYSTEM_AUTOMATIONS,
} from "@/lib/ai/intelligence/system-automations";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ automations: SYSTEM_AUTOMATIONS });
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guardMutatingAdminAi } = await import("@/lib/admin-request-guard");
  const blocked = await guardMutatingAdminAi(request, "admin-ai:automations");
  if (blocked) return blocked;

  const body = (await request.json().catch(() => ({}))) as { id?: string };
  if (body.id) {
    const result = await runSystemAutomation(body.id);
    return NextResponse.json(result);
  }
  const results = await runAllSystemAutomations();
  return NextResponse.json({
    ok: true,
    results,
    notificationsCreated: results.reduce((s, r) => s + (r.createdNotifications ?? 0), 0),
  });
}
