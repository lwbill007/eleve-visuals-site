import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { revalidateSessionPages } from "@/lib/revalidate-public";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const order = body.order as { id: string; sortOrder: number }[] | undefined;
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  await Promise.all(
    order.map((item) =>
      prisma.sessionVolume.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  );

  revalidateSessionPages();
  return NextResponse.json({ ok: true });
}
