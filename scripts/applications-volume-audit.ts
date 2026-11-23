/**
 * One-time audit: session applications with no volume (sessionVolumeId null).
 *
 *   npx tsx scripts/applications-volume-audit.ts          # report only (default)
 *   npx tsx scripts/applications-volume-audit.ts --apply  # link CONFIDENT matches only
 *
 * Read-only unless --apply. Even with --apply it only sets sessionVolumeId on
 * applications whose own payload names the volume (id or slug). Probable,
 * conflicting and no-evidence records are listed for manual review and never
 * touched. Nothing is deleted. Run against production only with owner approval.
 */
import { PrismaClient } from "@prisma/client";
import { classifyUnassignedApplication } from "../src/lib/application-cycles";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  const volumes = await prisma.sessionVolume.findMany({
    select: { id: true, slug: true, title: true, volumeNumber: true },
  });
  const rows = await prisma.submission.findMany({
    where: { type: "session", sessionVolumeId: null },
    select: { id: true, data: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const report = rows.map((row) => {
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(row.data) as Record<string, unknown>;
    } catch {
      /* unreadable payload → no evidence */
    }
    return { id: row.id, createdAt: row.createdAt.toISOString(), ...classifyUnassignedApplication(data, volumes) };
  });

  const counts = report.reduce<Record<string, number>>((acc, item) => {
    acc[item.kind] = (acc[item.kind] ?? 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({ volumes: volumes.length, unassigned: rows.length, counts }, null, 2));
  for (const item of report) {
    const target = "volumeId" in item ? volumes.find((v) => v.id === item.volumeId) : undefined;
    console.log(
      `${item.kind.padEnd(11)} ${item.id} ${item.createdAt.slice(0, 10)} ${target ? `→ Vol. ${target.volumeNumber} ${target.title}` : ""} (${item.evidence})`
    );
  }

  if (!apply) {
    console.log("\nReport only. Re-run with --apply to link the confident matches.");
    return;
  }
  let linked = 0;
  for (const item of report) {
    if (item.kind !== "confident") continue;
    const result = await prisma.submission.updateMany({
      where: { id: item.id, sessionVolumeId: null },
      data: { sessionVolumeId: item.volumeId },
    });
    linked += result.count;
  }
  console.log(`\nLinked ${linked} confident application(s). Others left for manual review.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
