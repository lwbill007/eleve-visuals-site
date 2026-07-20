import {
  getAboutContent,
  getHeroContent,
  getNavigationConfig,
  getPortfolioItems,
  getServices,
  getSessionsContent,
  getSiteConfig,
  getTestimonials,
} from "@/lib/content";
import { getSponsorMetrics } from "@/lib/admin-os-server";
import { prisma } from "@/lib/db";
import { writeMemory } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import type { BrandInstitutionalMemory } from "./types";

const BRAND_KEY = "institutional";

export async function buildBrandInstitutionalMemory(): Promise<BrandInstitutionalMemory> {
  const [site, hero, about, services, portfolio, , nav, , sponsors, volumes] =
    await Promise.all([
      getSiteConfig().catch(() => null),
      getHeroContent().catch(() => null),
      getAboutContent().catch(() => null),
      getServices(true).catch(() => []),
      getPortfolioItems(true).catch(() => []),
      getSessionsContent().catch(() => null),
      getNavigationConfig().catch(() => null),
      getTestimonials(true).catch(() => []),
      getSponsorMetrics().catch(() => null),
      prisma.sessionVolume.findMany({ where: { published: true, archived: false }, take: 6 }).catch(() => []),
    ]);

  const memory: BrandInstitutionalMemory = {
    identity: {
      name: site?.name ?? "ÉLEVÉ Visuals",
      tagline: site?.tagline ?? "",
      description: site?.description ?? "",
      voice: "Premium, cinematic, editorial — confident but warm. Never salesy.",
      visualStyle: "Cinematic noir lighting, editorial composition, luxury portrait aesthetic",
      tone: hero?.headline ? `Hero: ${hero.headline}` : site?.tagline ?? "editorial luxury",
    },
    idealClients: [
      "Professionals seeking premium portrait branding",
      "Models and creatives applying to ÉLEVÉ Sessions",
      "Brands seeking cinematic visual storytelling",
      ...(about?.philosophy?.pillars?.map((p) => p.title) ?? []),
    ],
    businessGoals: [
      "Increase portrait booking inquiries",
      "Grow ÉLEVÉ Sessions community",
      "Maximize client lifetime value and referrals",
      "Strengthen premium brand positioning",
    ],
    services: services.map((s) => ({
      title: s.title,
      price: s.startingPrice,
      tagline: s.tagline,
    })),
    competitiveAdvantages: [
      "Cinematic editorial quality vs standard headshots",
      "ÉLEVÉ Sessions — unique editorial casting series",
      "Full creative process documentation",
      "Premium client experience end-to-end",
      site?.serviceArea ? `Serving ${site.serviceArea}` : "Boutique studio experience",
    ],
    customerJourney: [
      "Discovery (Instagram, portfolio, referrals, SEO)",
      "Trust building (portfolio, testimonials, sessions brand)",
      "Inquiry (/book)",
      "Consultation & booking",
      "Session & delivery",
      "Gallery delivery → referral loop",
    ],
    salesFunnel: [
      `Homepage → ${hero?.primaryCta?.href ?? "/book"}`,
      "Portfolio → Book similar session",
      "Services → Package selection → Book",
      "Sessions → Apply → Cast → Community",
      "CRM re-engagement → Repeat booking",
    ],
    websiteStructure: nav?.navLinks?.map((l) => `${l.label} (${l.href})`) ?? [],
    portfolioHighlights: portfolio.slice(0, 8).map((p) => `${p.title} · ${p.category}`),
    sessionsOverview: volumes.map((v) => `Vol ${v.volumeNumber}: ${v.title} (${v.status})`),
    awards: [],
    sponsorships: sponsors ? [`${sponsors.sessionVolumes} session volumes · ${sponsors.uniqueVisitors} visitors`] : [],
    lastSyncedAt: new Date().toISOString(),
  };

  await writeMemory({
    workspaceId: getWorkspaceId(),
    layer: "marketing",
    category: "brand_identity",
    key: BRAND_KEY,
    title: "ÉLEVÉ brand institutional memory",
    summary: `${memory.identity.name} · ${memory.services.length} services · ${memory.portfolioHighlights.length} portfolio highlights · permanent CMO context`,
    value: memory as unknown as Record<string, unknown>,
    confidence: 0.98,
    importance: 100,
    source: "sync",
    sourceRef: "brand:institutional",
    tags: ["cmo", "brand", "institutional", "pinned-context"],
    pinned: true,
    verified: true,
    actor: "cmo-intelligence",
    reason: "Permanent brand understanding — never archive",
  });

  return memory;
}

export async function getBrandInstitutionalMemory(): Promise<BrandInstitutionalMemory | null> {
  const { getMemory } = await import("../memory/store");
  const mem = await getMemory("marketing", "brand_identity", BRAND_KEY, getWorkspaceId());
  if (!mem?.value) return buildBrandInstitutionalMemory();
  return mem.value as unknown as BrandInstitutionalMemory;
}
