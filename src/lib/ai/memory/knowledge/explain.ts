import { getMemoryAudits, getMemoryById } from "../store";
import { prisma } from "@/lib/db";
import type { MemoryExplanation } from "./types";

export async function explainMemory(memoryId: string): Promise<MemoryExplanation | null> {
  const memory = await getMemoryById(memoryId);
  if (!memory) return null;

  const relations = await prisma.aIMemoryRelation.findMany({
    where: { OR: [{ fromMemoryId: memoryId }, { toMemoryId: memoryId }] },
    include: {
      fromMemory: { select: { id: true, title: true } },
      toMemory: { select: { id: true, title: true } },
    },
    take: 12,
  });

  const relatedMemories = relations.map((r) => {
    const other = r.fromMemoryId === memoryId ? r.toMemory : r.fromMemory;
    return { id: other.id, title: other.title, relationType: r.relationType };
  });

  const value = memory.value;
  const whyItMatters = (value.whyItMatters as string) ?? memory.summary;
  const sourcePage = (value.sourcePage as string) ?? memory.sourceRef.replace("platform:", "") ?? "unknown";
  const evidence = (value.evidence as string[]) ?? [memory.summary];
  const businessArea = (value.businessArea as string) ?? memory.layer;
  const pagesReferenced = [sourcePage].filter((p) => p && p !== "unknown");
  const analyticsReferenced: string[] = [];

  if (value.pageviews30d !== undefined) analyticsReferenced.push(`${value.pageviews30d} pageviews (30d)`);
  if (value.conversionRate30d !== undefined) analyticsReferenced.push(`${value.conversionRate30d}% conversion`);
  if (value.topPages) analyticsReferenced.push("Analytics top pages");

  const reasoningChain = [
    `Source: ${memory.source} · ${memory.sourceRef}`,
    `Business area: ${businessArea}`,
    whyItMatters,
    ...evidence.map((e) => `Evidence: ${e}`),
    memory.verified ? "Status: admin-verified" : `Confidence: ${Math.round(memory.confidence * 100)}%`,
  ];

  const uncertain = memory.confidence < 0.65 && !memory.verified;
  const audits = await getMemoryAudits(memoryId, 10);

  return {
    memoryId,
    title: memory.title,
    whyItMatters,
    confidence: memory.confidence,
    sourcePage,
    sourceRef: memory.sourceRef,
    businessArea,
    evidence,
    relatedMemories,
    pagesReferenced,
    analyticsReferenced,
    reasoningChain,
    uncertain,
    uncertaintyNote: uncertain
      ? "This memory has not been verified and confidence is below threshold — treat as tentative."
      : undefined,
    audits,
  };
}
