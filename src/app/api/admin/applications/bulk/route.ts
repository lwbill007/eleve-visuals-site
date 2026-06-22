import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const ids = body.ids as string[] | undefined;
  const status = body.status as ApplicationStatus | undefined;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No applications selected" }, { status: 400 });
  }
  if (!status || !(APPLICATION_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await prisma.submission.updateMany({
    where: { id: { in: ids }, type: "session" },
    data: { status },
  });

  return NextResponse.json({ ok: true, updated: ids.length });
}
