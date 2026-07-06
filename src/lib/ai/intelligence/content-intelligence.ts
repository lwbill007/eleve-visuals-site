import { searchMemories } from "../memory/store";
import { listCampaignCaseStudies } from "../marketing/campaign-memory";
import type { ContentIntelligenceSummary, ContentPostMetric } from "../types";

export async function getContentIntelligence(): Promise<ContentIntelligenceSummary> {
  const [campaigns, marketingMemories] = await Promise.all([
    listCampaignCaseStudies(20),
    searchMemories({ layer: "marketing", category: "experiment", limit: 15 }),
  ]);

  const posts: ContentPostMetric[] = campaigns.map((c) => ({
    id: c.id,
    title: c.title,
    platform: c.platform,
    revenueGenerated: c.metrics.revenue ?? 0,
    websiteVisits: c.metrics.clicks ?? 0,
    profileVisits: c.metrics.reach ? Math.round(c.metrics.reach * 0.15) : 0,
    shares: c.metrics.shares ?? 0,
    saves: c.metrics.saves ?? 0,
    watchTimeSeconds: 0,
    followersGained: c.metrics.growth ?? 0,
    bookingsInfluenced: c.metrics.bookings ?? 0,
    similarWinners: c.lessonsLearned.slice(0, 2),
    dataSource: c.metrics.revenue ? "memory" : "estimated",
  }));

  for (const mem of marketingMemories.items.filter((m) => m.tags.includes("instagram"))) {
    posts.push({
      id: mem.id,
      title: mem.title,
      platform: "instagram",
      revenueGenerated: (mem.value.revenue as number) ?? 0,
      websiteVisits: (mem.value.views as number) ?? 0,
      profileVisits: 0,
      shares: 0,
      saves: 0,
      watchTimeSeconds: 0,
      followersGained: 0,
      bookingsInfluenced: 0,
      similarWinners: [],
      dataSource: "memory",
    });
  }

  const topPerformingHooks = campaigns
    .filter((c) => c.hook)
    .sort((a, b) => (b.metrics.revenue ?? 0) - (a.metrics.revenue ?? 0))
    .slice(0, 5)
    .map((c) => c.hook);

  return {
    generatedAt: new Date().toISOString(),
    posts: posts.slice(0, 12),
    topPerformingHooks,
    recommendation:
      posts.length > 0
        ? "Double down on hooks and formats from top-performing campaign memories"
        : "Connect Instagram/Meta API or log campaign results in Marketing Studio to build content intelligence",
    externalConnected: false,
  };
}
