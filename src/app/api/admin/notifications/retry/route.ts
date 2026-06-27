import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { retryNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
  }

  const result = await retryNotification(body.id);

  void logActivity({
    action: "notifications.retry",
    target: body.id,
    details: result.ok ? "Retry succeeded" : `Retry failed: ${result.error ?? "unknown"}`,
    request,
  });

  if (result.ok) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { ok: false, error: result.error || "Retry failed" },
    { status: 502 }
  );
}
