import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dismissAINotification, markAINotificationRead } from "@/lib/ai/intelligence/notifications";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { action } = (await req.json()) as { action?: "read" | "dismiss" };

  if (action === "dismiss") await dismissAINotification(id);
  else await markAINotificationRead(id);

  return NextResponse.json({ ok: true });
}
