import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookingDetailClient } from "./BookingDetailClient";

export default async function BookingCommandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const row = await prisma.submission.findUnique({ where: { id } });
  if (!row || row.type !== "booking") notFound();

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(row.data) as Record<string, unknown>;
  } catch {
    data = {};
  }

  return (
    <BookingDetailClient
      submission={{
        id: row.id,
        status: row.status,
        notes: row.notes || "",
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        contactEmail: row.contactEmail || "",
        data,
      }}
    />
  );
}
