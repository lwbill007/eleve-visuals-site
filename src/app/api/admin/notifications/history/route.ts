import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { truncatePreview } from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";
import type { NotificationLogDTO } from "@/lib/types";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
  const includeArchived = searchParams.get("archived") === "true";
  const channel = searchParams.get("channel");
  const statusParam = searchParams.get("status");
  const q = searchParams.get("q")?.trim();

  const where: {
    archived?: boolean;
    channel?: string;
    status?: string;
    OR?: { recipient?: { contains: string; mode: "insensitive" }; subject?: { contains: string; mode: "insensitive" }; error?: { contains: string; mode: "insensitive" } }[];
  } = {};
  if (!includeArchived) where.archived = false;
  if (channel && ["email", "sms", "push", "webhook"].includes(channel)) where.channel = channel;
  if (statusParam && ["sent", "failed", "skipped", "pending"].includes(statusParam)) {
    where.status = statusParam;
  }
  if (q) {
    where.OR = [
      { recipient: { contains: q, mode: "insensitive" } },
      { subject: { contains: q, mode: "insensitive" } },
      { error: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, unreadCount, archivedCount] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notificationLog.count({ where: { read: false, archived: false } }),
    prisma.notificationLog.count({ where: { archived: true } }),
  ]);

  const history: NotificationLogDTO[] = rows.map((row) => ({
    id: row.id,
    submissionId: row.submissionId,
    formType: row.formType,
    channel: row.channel as NotificationLogDTO["channel"],
    provider: row.provider,
    recipient: row.recipient,
    subject: row.subject,
    preview: truncatePreview(row.preview),
    status: row.status as NotificationLogDTO["status"],
    error: row.error,
    attempts: row.attempts,
    read: row.read,
    archived: row.archived,
    createdAt: row.createdAt.toISOString(),
  }));

  return NextResponse.json({ history, unreadCount, archivedCount });
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; ids?: string[]; read?: boolean; archived?: boolean; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.action === "markAllRead") {
    const result = await prisma.notificationLog.updateMany({
      where: { read: false },
      data: { read: true },
    });
    void logActivity({
      action: "notifications.markAllRead",
      target: "notification history",
      details: `Marked ${result.count} notifications read`,
      request,
    });
    return NextResponse.json({ ok: true });
  }

  const ids = body.ids ?? (body.id ? [body.id] : []);
  if (ids.length === 0) {
    return NextResponse.json({ error: "No notification ids provided" }, { status: 400 });
  }

  const data: { read?: boolean; archived?: boolean } = {};
  if (typeof body.read === "boolean") data.read = body.read;
  if (typeof body.archived === "boolean") {
    data.archived = body.archived;
    // Archiving implies read.
    if (body.archived) data.read = true;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await prisma.notificationLog.updateMany({ where: { id: { in: ids } }, data });

  if (typeof data.archived === "boolean") {
    void logActivity({
      action: data.archived ? "notifications.archive" : "notifications.unarchive",
      target: "notification history",
      details: `${ids.length} notification(s)`,
      request,
    });
  }

  return NextResponse.json({ ok: true });
}
