import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { truncatePreview } from "@/lib/notifications";

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await prisma.notificationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const header = [
    "Created (UTC)",
    "Form",
    "Channel",
    "Provider",
    "Recipient",
    "Status",
    "Attempts",
    "Subject",
    "Preview",
    "Error",
    "Submission ID",
  ];

  const lines = rows.map((row) =>
    [
      row.createdAt.toISOString(),
      row.formType,
      row.channel,
      row.provider,
      row.recipient,
      row.status,
      String(row.attempts),
      row.subject,
      truncatePreview(row.preview),
      row.error,
      row.submissionId ?? "",
    ]
      .map((c) => csvCell(String(c)))
      .join(",")
  );

  const csv = [header.map(csvCell).join(","), ...lines].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8;",
      "Content-Disposition": `attachment; filename="eleve-notifications-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
