import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

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
      data: JSON.parse(s.data),
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

  const { id, read } = await request.json();
  await prisma.submission.update({ where: { id }, data: { read: !!read } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();
  await prisma.submission.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
