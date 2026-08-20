import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VERIFIED_SETTLED_PAYMENT_WHERE } from "@/lib/payments";
import { BookingDetailClient } from "./BookingDetailClient";

export default async function BookingCommandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [row, paymentAgg] = await Promise.all([
    prisma.submission.findUnique({ where: { id } }),
    prisma.payment.aggregate({
      where: { submissionId: id, ...VERIFIED_SETTLED_PAYMENT_WHERE },
      _sum: { amountCents: true },
      _count: true,
    }),
  ]);
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
      verifiedPayment={{
        amountCents: paymentAgg._sum.amountCents ?? 0,
        count: paymentAgg._count,
      }}
    />
  );
}
