import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

function parseSubmissionData(raw: string) {
  try {
    const data = JSON.parse(raw);
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
    return { _raw: data };
  } catch {
    return { _parseError: true, _raw: raw };
  }
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const submissions = await prisma.submission.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(
    submissions.map((s) => ({
      id: s.id,
      type: s.type,
      data: parseSubmissionData(s.data),
      read: s.read,
      createdAt: s.createdAt.toISOString(),
    }))
  );
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, read } = await request.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
    }

    await prisma.submission.update({ where: { id }, data: { read: !!read } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
    }

    await prisma.submission.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
