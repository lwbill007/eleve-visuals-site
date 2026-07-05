import { writeMemory, searchMemories, getMemory } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import type { CampaignCaseStudy, RegisterCampaignInput } from "./types";
import { TASK_TO_PLATFORM } from "./types";
import type { AIGenerateTask } from "../types";

function mapCampaign(mem: { id: string; key: string; title: string; value: Record<string, unknown>; createdAt: string; updatedAt: string }): CampaignCaseStudy {
  const v = mem.value;
  return {
    id: mem.key,
    title: mem.title,
    platform: (v.platform as CampaignCaseStudy["platform"]) ?? "other",
    contentType: (v.contentType as string) ?? "post",
    objective: (v.objective as string) ?? "",
    audience: (v.audience as string) ?? "",
    creative: (v.creative as string) ?? "",
    headline: (v.headline as string) ?? "",
    hook: (v.hook as string) ?? "",
    cta: (v.cta as string) ?? "",
    offer: (v.offer as string) ?? "",
    budget: v.budget as number | undefined,
    postingTime: v.postingTime as string | undefined,
    metrics: (v.metrics as CampaignCaseStudy["metrics"]) ?? {},
    lessonsLearned: (v.lessonsLearned as string[]) ?? [],
    status: (v.status as CampaignCaseStudy["status"]) ?? "draft",
    createdAt: mem.createdAt,
    updatedAt: mem.updatedAt,
    memoryId: mem.id,
  };
}

export async function listCampaignCaseStudies(limit = 50): Promise<CampaignCaseStudy[]> {
  const { items } = await searchMemories({
    workspaceId: getWorkspaceId(),
    layer: "marketing",
    category: "campaign_case_study",
    limit,
  });
  return items.map(mapCampaign);
}

export async function registerCampaign(input: RegisterCampaignInput): Promise<CampaignCaseStudy> {
  const workspaceId = getWorkspaceId();
  const id = `campaign-${Date.now()}`;
  const platform = input.platform ?? (input.task ? TASK_TO_PLATFORM[input.task] : undefined) ?? "other";
  const now = new Date().toISOString();

  const caseStudy: CampaignCaseStudy = {
    id,
    title: input.title,
    platform,
    contentType: input.contentType,
    objective: input.objective ?? "Drive awareness and bookings",
    audience: input.audience ?? "Ideal ÉLEVÉ clients",
    creative: input.creative ?? "",
    headline: input.headline ?? input.title,
    hook: input.hook ?? "",
    cta: input.cta ?? "Book at elevévisuals.com/book",
    offer: input.offer ?? "",
    metrics: {},
    lessonsLearned: [],
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
  };

  const mem = await writeMemory({
    workspaceId,
    layer: "marketing",
    category: "campaign_case_study",
    key: id,
    title: caseStudy.title,
    summary: `${platform} · ${caseStudy.contentType} · ${caseStudy.status}`,
    value: caseStudy as unknown as Record<string, unknown>,
    confidence: 0.9,
    importance: 75,
    source: "user",
    sourceRef: `campaign:${platform}`,
    tags: ["cmo", "campaign", platform, caseStudy.contentType],
    actor: "cmo-intelligence",
    reason: "Campaign registered as permanent case study",
  });

  return { ...caseStudy, memoryId: mem.id };
}

export async function registerCampaignFromGeneration(
  task: AIGenerateTask,
  prompt: string,
  content: string
): Promise<CampaignCaseStudy> {
  const platform = TASK_TO_PLATFORM[task] ?? "other";
  const firstLine = content.split("\n").find((l) => l.trim())?.slice(0, 120) ?? prompt.slice(0, 120);

  return registerCampaign({
    title: `${task.replace(/_/g, " ")} · ${new Date().toLocaleDateString()}`,
    platform,
    contentType: task,
    objective: prompt.slice(0, 200),
    creative: content.slice(0, 2000),
    hook: firstLine,
    headline: firstLine,
    task,
    status: "draft",
  });
}

export async function updateCampaignMetrics(
  campaignId: string,
  metrics: Partial<CampaignCaseStudy["metrics"]>,
  lessonsLearned?: string[]
): Promise<CampaignCaseStudy | null> {
  const mem = await getMemory("marketing", "campaign_case_study", campaignId, getWorkspaceId());
  if (!mem) return null;

  const existing = mapCampaign(mem);
  const updated: CampaignCaseStudy = {
    ...existing,
    metrics: { ...existing.metrics, ...metrics },
    lessonsLearned: lessonsLearned ?? existing.lessonsLearned,
    status: metrics.bookings || metrics.revenue ? "completed" : existing.status,
    updatedAt: new Date().toISOString(),
  };

  if (updated.metrics.views && updated.metrics.clicks) {
    updated.metrics.ctr = Math.round((updated.metrics.clicks / updated.metrics.views) * 1000) / 10;
  }
  if (updated.metrics.revenue && updated.budget) {
    updated.metrics.roi = Math.round(((updated.metrics.revenue - updated.budget) / updated.budget) * 100);
  }

  await writeMemory({
    workspaceId: getWorkspaceId(),
    layer: "marketing",
    category: "campaign_case_study",
    key: campaignId,
    title: updated.title,
    summary: `${updated.platform} · ROI ${updated.metrics.roi ?? "—"}% · ${updated.metrics.bookings ?? 0} bookings`,
    value: updated as unknown as Record<string, unknown>,
    confidence: 0.92,
    importance: Math.min(100, 70 + (updated.metrics.bookings ?? 0) * 5),
    source: mem.source,
    sourceRef: mem.sourceRef,
    tags: mem.tags,
    pinned: mem.pinned,
    verified: true,
    actor: "cmo-intelligence",
    reason: "Campaign metrics updated from outcomes",
  });

  return updated;
}
