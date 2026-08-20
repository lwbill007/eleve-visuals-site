import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireMinimumRole } from "@/lib/auth";
import { revalidateServicesPages } from "@/lib/revalidate-public";

export async function POST(request: Request) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const order = body.order as { id: string; sortOrder: number }[] | undefined;
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  await Promise.all(
    order.map((item) =>
      prisma.service.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    )
  );

  revalidateServicesPages();
  return NextResponse.json({ ok: true });
}
