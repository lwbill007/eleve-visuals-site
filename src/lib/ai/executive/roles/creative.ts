import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getPortfolioItems, getSessionsContent } from "@/lib/content";
import { prisma } from "@/lib/db";
import type { ExecutiveRoleBrief } from "../types";
import { ROLE_META } from "../types";

export async function buildCreativeBrief(): Promise<ExecutiveRoleBrief> {
  const [analytics, portfolio, sessions, volumes] = await Promise.all([
    getAnalyticsSummary(30),
    getPortfolioItems(true),
    getSessionsContent().catch(() => null),
    prisma.sessionVolume.findMany({
      where: { published: true, archived: false },
      orderBy: { volumeNumber: "desc" },
      take: 3,
    }),
  ]);

  const portfolioPages = analytics.topPages.filter((p) => p.path.startsWith("/portfolio"));
  const topProject = portfolioPages[0];
  const thinGalleries = portfolio.filter((p) => (p.gallery?.length ?? 0) < 3).length;
  const health = Math.min(
    100,
    Math.max(
      40,
      60 +
        (topProject ? 15 : 0) +
        Math.min(15, portfolio.length * 2) -
        thinGalleries * 3
    )
  );

  return {
    id: "creative",
    title: ROLE_META.creative.title,
    mission: ROLE_META.creative.mission,
    healthScore: health,
    confidence: 0.8,
    topPriority: topProject
      ? `Feature ${topProject.path} style (${topProject.views} views) in homepage hero rotation`
      : "Publish portfolio work to build social proof",
    insights: [
      {
        text: `${portfolio.length} published projects · ${portfolioPages.reduce((s, p) => s + p.views, 0)} portfolio pageviews`,
        kind: "fact",
      },
      ...(topProject
        ? [{ text: `Top performer: ${topProject.path} (${topProject.views} views)`, kind: "fact" as const }]
        : []),
      {
        text: thinGalleries > 0 ? `${thinGalleries} projects have thin galleries (<3 images)` : "Gallery depth healthy",
        kind: thinGalleries > 0 ? "suggestion" : "fact",
      },
      {
        text: volumes[0] ? `Latest session: Vol ${volumes[0].volumeNumber} — ${volumes[0].title}` : "No active volumes",
        kind: "fact",
      },
    ],
    recommendations: [
      ...(thinGalleries > 0
        ? [
            {
              id: "creative-gallery",
              title: "Strengthen thin portfolio galleries",
              detail: `${thinGalleries} projects need more images for trust and Instagram carousels`,
              why: "Thin galleries reduce conversion on portfolio pages",
              kind: "suggestion" as const,
              confidence: 0.78,
              expectedImpact: "+5–12% portfolio engagement",
              actions: [
                { id: "portfolio", label: "Edit Portfolio", type: "navigate" as const, href: "/admin/portfolio" },
              ],
            },
          ]
        : []),
      {
        id: "creative-sessions",
        title: "Sessions creative direction",
        detail: sessions?.mood?.headline ?? "Maintain editorial cinematic consistency across volumes",
        why: "Visual consistency protects premium brand positioning",
        kind: "suggestion",
        confidence: 0.75,
        expectedImpact: "Brand equity",
        actions: [
          { id: "sessions", label: "Sessions Hub", type: "navigate", href: "/admin/sessions" },
        ],
      },
    ],
    metrics: [
      { label: "Projects", value: String(portfolio.length), source: "Portfolio" },
      { label: "Top views", value: String(topProject?.views ?? 0), source: "Analytics" },
      { label: "Volumes", value: String(volumes.length), source: "Sessions" },
      { label: "Thin galleries", value: String(thinGalleries), source: "Portfolio audit" },
    ],
    href: ROLE_META.creative.href,
  };
}
