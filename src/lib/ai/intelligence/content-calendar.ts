import { getOperatorMetrics } from "./business-operator";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { getMemory } from "../memory/store";
import { isAIConfigured } from "../config";
import { aiComplete } from "../adapter";

export interface ContentCalendarItem {
  date: string;
  channel: "instagram" | "email" | "blog" | "tiktok" | "portfolio";
  title: string;
  hook: string;
  cta: string;
  rationale: string;
  confidence: number;
}

export interface ContentCalendar {
  generatedAt: string;
  month: string;
  theme: string;
  items: ContentCalendarItem[];
  provider: string;
}

function nextDays(count: number): string[] {
  const days: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i * 2);
    days.push(x.toISOString().slice(0, 10));
  }
  return days;
}

function heuristicCalendar(metrics: Awaited<ReturnType<typeof getOperatorMetrics>>): ContentCalendarItem[] {
  const dates = nextDays(8);
  return [
    {
      date: dates[0],
      channel: "instagram",
      title: "Portfolio spotlight",
      hook: "A frame that stopped us mid-edit.",
      cta: "Link in bio to book",
      rationale: `${metrics.traffic.topPage} drives traffic — repurpose top work`,
      confidence: 0.72,
    },
    {
      date: dates[1],
      channel: "email",
      title: "Re-engagement touch",
      hook: "Still thinking about your portrait session?",
      cta: "Reply to reserve a date",
      rationale: `${metrics.attention.followUpClients} inactive clients in CRM`,
      confidence: 0.68,
    },
    {
      date: dates[2],
      channel: "instagram",
      title: "BTS Sessions clip",
      hook: "Behind the volume.",
      cta: "Apply for next Sessions",
      rationale: "Sessions applications benefit from social proof",
      confidence: 0.7,
    },
    {
      date: dates[3],
      channel: "blog",
      title: "Creative process essay",
      hook: "How we build a cinematic frame",
      cta: "Explore portfolio",
      rationale: "SEO + authority for luxury positioning",
      confidence: 0.65,
    },
    {
      date: dates[4],
      channel: "tiktok",
      title: "Lighting breakdown",
      hook: "60 seconds of set magic",
      cta: "Follow for more BTS",
      rationale: "Short-form discovery for younger audience",
      confidence: 0.6,
    },
    {
      date: dates[5],
      channel: "portfolio",
      title: "Homepage hero refresh",
      hook: "Lead with highest-converting project",
      cta: "Book inquiry",
      rationale: `Conversion at ${metrics.traffic.conversionRate}%`,
      confidence: 0.74,
    },
  ];
}

export async function generateContentCalendar(forceAI = false): Promise<ContentCalendar> {
  const now = new Date();
  const month = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const [metrics, analytics] = await Promise.all([getOperatorMetrics(), getAnalyticsSummary(30)]);
  const brandMem = await getMemory("brand", "identity", "core").catch(() => null);

  const baseItems = heuristicCalendar(metrics);

  if (!forceAI || !isAIConfigured()) {
    return {
      generatedAt: now.toISOString(),
      month,
      theme: "Cinematic luxury + pipeline growth",
      items: baseItems,
      provider: "rules",
    };
  }

  const prompt = `Generate a 2-week content calendar for ÉLEVÉ Visuals (luxury cinematic photography).
Metrics: ${metrics.month.bookings} bookings this month, ${analytics.totals.uniqueSessions} visitors/30d, top page ${metrics.traffic.topPage}.
Brand: ${brandMem?.summary?.slice(0, 200) ?? "minimal dark luxury"}.

Return JSON array of objects: date (YYYY-MM-DD), channel, title, hook, cta, rationale, confidence (0-1).
Channels: instagram, email, blog, tiktok, portfolio. 6 items.`;

  const result = await aiComplete({
    messages: [
      { role: "system", content: "You are CMO. Return only valid JSON array." },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
    maxTokens: 1200,
    task: "marketing_strategy",
    validateResponse: (content) => {
      const json = content.match(/\[[\s\S]*\]/)?.[0];
      if (!json) return false;
      const parsed = JSON.parse(json);
      return Array.isArray(parsed);
    },
  });

  if (result) {
    try {
      const match = result.content.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(match?.[0] ?? "[]") as ContentCalendarItem[];
      if (parsed.length > 0) {
        return {
          generatedAt: now.toISOString(),
          month,
          theme: "AI-generated from live analytics",
          items: parsed.slice(0, 10),
          provider: result.provider,
        };
      }
    } catch {
      /* fallback */
    }
  }

  return {
    generatedAt: now.toISOString(),
    month,
    theme: "Cinematic luxury + pipeline growth",
    items: baseItems,
    provider: result?.provider ?? "rules",
  };
}
