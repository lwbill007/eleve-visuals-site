import { prisma } from "@/lib/db";
import { normalizeApplicationStatus } from "@/lib/types";
import { generateAIContent } from "../service";
import type { SessionApplicationRank } from "../types";

function parseData(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function scoreApplication(data: Record<string, unknown>, status: string): number {
  let score = 50;

  if (typeof data.experience === "string" && data.experience.length > 100) score += 10;
  if (typeof data.whyJoin === "string" && data.whyJoin.length > 80) score += 15;
  if (typeof data.instagram === "string" && data.instagram.length > 3) score += 5;
  if (Array.isArray(data.roles) && data.roles.length > 0) score += 5;
  if (data.portfolioUrl || data.portfolioLink) score += 10;

  const st = normalizeApplicationStatus(status);
  if (st === "shortlisted") score += 20;
  if (st === "accepted") score += 30;
  if (st === "declined") score -= 30;

  return Math.min(100, Math.max(0, score));
}

export async function rankSessionApplications(volumeId?: string): Promise<SessionApplicationRank[]> {
  const apps = await prisma.submission.findMany({
    where: {
      type: "session",
      ...(volumeId ? { sessionVolumeId: volumeId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, data: true, status: true, contactEmail: true, createdAt: true, sessionVolumeId: true },
  });

  const ranked = apps
    .map((app) => {
      const data = parseData(app.data);
      const name = String(data.fullName || data.name || app.contactEmail);
      const roles = Array.isArray(data.roles) ? (data.roles as string[]) : [];
      const score = scoreApplication(data, app.status);

      return {
        id: app.id,
        name,
        email: app.contactEmail,
        roles,
        status: normalizeApplicationStatus(app.status),
        score,
        summary: `${name} — ${roles.join(", ") || "applicant"}. Score ${score}/100.`,
        strengths: [
          data.whyJoin ? "Strong motivation statement" : null,
          data.instagram ? "Social presence" : null,
          data.portfolioUrl || data.portfolioLink ? "Portfolio provided" : null,
        ].filter(Boolean) as string[],
        href: `/admin/applications?focus=${app.id}`,
        createdAt: app.createdAt.toISOString(),
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked;
}

export async function generateApplicationRankingSummary(volumeId?: string): Promise<string> {
  const ranked = await rankSessionApplications(volumeId);
  const result = await generateAIContent({
    task: "general",
    prompt: "Summarize top session applicants and recommend who to shortlist. Human makes final decisions.",
    context: { topApplicants: ranked.slice(0, 10) },
  });
  return result.content;
}
