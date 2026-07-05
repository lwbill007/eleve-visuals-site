import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAINotifications } from "@/lib/ai/intelligence/notifications";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unreadOnly = new URL(req.url).searchParams.get("unread") === "1";
  const notifications = await getAINotifications(unreadOnly);
  return NextResponse.json({ notifications });
}
