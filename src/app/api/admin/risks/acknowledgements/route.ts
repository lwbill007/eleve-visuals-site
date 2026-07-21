import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  riskId: z.string().min(1).max(200),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.activityLog.findMany({
      where: { action: "risk_acknowledged" },
      orderBy: { createdAt: "desc" },
      select: { target: true, createdAt: true },
      take: 1000,
    });
    const acknowledgements: Record<string, string> = {};
    for (const row of rows) {
      if (row.target && !acknowledgements[row.target]) {
        acknowledgements[row.target] = row.createdAt.toISOString();
      }
    }
    return NextResponse.json({ acknowledgements, scope: "shared-admin-workspace" });
  } catch (error) {
    console.error("Risk acknowledgement load failed:", error);
    return NextResponse.json({ error: "Could not load acknowledgements" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid risk acknowledgement" }, { status: 400 });
  }

  try {
    const row = await prisma.activityLog.create({
      data: {
        actor: "admin",
        action: "risk_acknowledged",
        target: parsed.data.riskId,
        details: JSON.stringify({ scope: "shared-admin-workspace" }),
      },
      select: { createdAt: true },
    });
    return NextResponse.json({ ok: true, acknowledgedAt: row.createdAt.toISOString() });
  } catch (error) {
    console.error("Risk acknowledgement save failed:", error);
    return NextResponse.json({ error: "Could not save acknowledgement" }, { status: 500 });
  }
}
