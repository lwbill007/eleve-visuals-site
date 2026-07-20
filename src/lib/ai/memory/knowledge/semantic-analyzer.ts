import type { DiscoveredRoute } from "./route-discovery";
import type { KnowledgeFinding, KnowledgeRelation, PlatformIssue } from "./types";
import type { MemoryLayer } from "../types";
import {
  getBookingOptions,
  getContactPage,
  getHeroContent,
  getHomepageContent,
  getNavigationConfig,
  getPortfolioItems,
  getPortfolioPageContent,
  getServices,
  getServicesPageContent,
  getSessionsContent,
  getSiteConfig,
  getTestimonials,
} from "@/lib/content";
import {
  getAdminCRMContacts,
  getAdminDashboardOS,
  getAdminPipeline,
  getSponsorMetrics,
} from "@/lib/admin-os-server";
import { getAnalyticsSummary } from "@/lib/analytics-server";
import { prisma } from "@/lib/db";

export interface SemanticPageUnderstanding {
  route: DiscoveredRoute;
  title: string;
  purpose: string;
  businessGoals: string[];
  offers: string[];
  pricing: string[];
  ctas: { label: string; href: string }[];
  seo: { title?: string; description?: string; score: number; issues: string[] };
  branding: { tone: string; consistency: number; notes: string[] };
  imagery: { hasHero: boolean; galleryCount: number; notes: string[] };
  clientExperience: string[];
  marketingStrategy: string[];
  navigation: { inbound: string[]; outbound: string[] };
  semanticTokens: string[];
  tone: string;
  confidence: number;
  importance: number;
  layer: MemoryLayer;
  category: string;
  key: string;
  businessArea: string;
  relatedKeys: KnowledgeRelation[];
  issues: PlatformIssue[];
  evidence: string[];
  rawSummary: string;
}

function issue(
  type: PlatformIssue["type"],
  severity: PlatformIssue["severity"],
  title: string,
  detail: string,
  page: string
): PlatformIssue {
  return { type, severity, title, detail, page };
}

function tokens(...parts: (string | undefined)[]): string[] {
  return [...new Set(parts.filter(Boolean).map((p) => p!.toLowerCase().trim()).filter((p) => p.length > 2))];
}

export async function analyzePlatformRoutes(
  routes: DiscoveredRoute[]
): Promise<SemanticPageUnderstanding[]> {
  const [
    site,
    hero,
    ,
    nav,
    portfolioPage,
    portfolioItems,
    services,
    servicesPage,
    booking,
    contact,
    sessionsContent,
    testimonials,
    volumes,
    analytics30,
    dashboard,
    pipeline,
    crm,
    sponsors,
    mediaCount,
  ] = await Promise.all([
    getSiteConfig().catch(() => null),
    getHeroContent().catch(() => null),
    getHomepageContent().catch(() => null),
    getNavigationConfig().catch(() => null),
    getPortfolioPageContent().catch(() => null),
    getPortfolioItems(true).catch(() => []),
    getServices(true).catch(() => []),
    getServicesPageContent().catch(() => null),
    getBookingOptions().catch(() => null),
    getContactPage().catch(() => null),
    getSessionsContent().catch(() => null),
    getTestimonials(true).catch(() => []),
    prisma.sessionVolume.findMany({ where: { archived: false }, include: { _count: { select: { cast: true } } } }).catch(() => []),
    getAnalyticsSummary(30).catch(() => null),
    getAdminDashboardOS().catch(() => null),
    getAdminPipeline().catch(() => null),
    getAdminCRMContacts().catch(() => []),
    getSponsorMetrics().catch(() => null),
    prisma.mediaAsset.count().catch(() => 0),
  ]);

  const portfolioBySlug = new Map(portfolioItems.map((p) => [p.slug, p]));
  const volumeBySlug = new Map(volumes.map((v) => [v.slug, v]));
  const understandings: SemanticPageUnderstanding[] = [];

  for (const route of routes) {
    const path = route.path;
    const views = analytics30?.topPages.find((p) => p.path === path)?.views ?? 0;
    const baseNav = {
      inbound: nav?.navLinks?.filter((l) => l.href === path || path.startsWith(l.href)).map((l) => l.label) ?? [],
      outbound: nav?.navLinks?.map((l) => `${l.label}→${l.href}`) ?? [],
    };

    if (path === "/") {
      understandings.push({
        route,
        title: "Homepage",
        purpose: "Primary brand entry — convert visitors into portrait bookings",
        businessGoals: ["Drive booking inquiries", "Establish premium positioning", "Route to portfolio & sessions"],
        offers: services.slice(0, 4).map((s) => s.title),
        pricing: services.map((s) => `${s.title}: from ${s.startingPrice}`),
        ctas: hero ? [{ label: hero.primaryCta?.label ?? "Book", href: hero.primaryCta?.href ?? "/book" }] : [],
        seo: {
          title: site?.name,
          description: site?.description?.slice(0, 160),
          score: hero?.headline ? 80 : 50,
          issues: !hero?.headline ? ["Missing hero headline"] : [],
        },
        branding: { tone: site?.tagline ?? "premium cinematic", consistency: 85, notes: [site?.tagline ?? ""] },
        imagery: { hasHero: Boolean(hero?.image), galleryCount: 0, notes: [] },
        clientExperience: ["First impression", "Clear CTA path to booking"],
        marketingStrategy: ["Hero conversion", "Featured work", "Sessions promotion"],
        navigation: baseNav,
        semanticTokens: tokens("homepage", "booking", site?.tagline, hero?.headline),
        tone: "premium editorial",
        confidence: 0.95,
        importance: 98,
        layer: "brand",
        category: "page",
        key: "homepage",
        businessArea: "marketing",
        relatedKeys: [
          { layer: "business", category: "page", key: "booking", relationType: "converts_to" },
          { layer: "creative", category: "page", key: "portfolio-index", relationType: "showcases" },
        ],
        issues: !hero?.primaryCta?.label ? [issue("conversion", "medium", "Missing primary CTA", "Homepage needs clear booking CTA", path)] : [],
        evidence: [`${views} views (30d)`, `${analytics30?.totals.conversionRate ?? 0}% site conversion`],
        rawSummary: `${site?.name} — ${hero?.headline ?? "hero"} · promotes bookings`,
      });
      continue;
    }

    const portfolioMatch = path.match(/^\/portfolio\/([^/]+)$/);
    if (portfolioMatch) {
      const item = portfolioBySlug.get(portfolioMatch[1]);
      if (!item) {
        understandings.push({
          route,
          title: `Missing portfolio: ${portfolioMatch[1]}`,
          purpose: "Orphan route — slug in router but not in database",
          businessGoals: [],
          offers: [],
          pricing: [],
          ctas: [],
          seo: { score: 0, issues: ["404 risk"] },
          branding: { tone: "", consistency: 0, notes: [] },
          imagery: { hasHero: false, galleryCount: 0, notes: [] },
          clientExperience: [],
          marketingStrategy: [],
          navigation: baseNav,
          semanticTokens: tokens("portfolio", "missing"),
          tone: "",
          confidence: 0.99,
          importance: 30,
          layer: "creative",
          category: "page",
          key: `orphan-${portfolioMatch[1]}`,
          businessArea: "creative",
          relatedKeys: [],
          issues: [issue("missing_content", "high", "Portfolio slug not found", "Route exists but project missing", path)],
          evidence: ["Router/discovery mismatch"],
          rawSummary: "Orphan portfolio route",
        });
        continue;
      }
      const galleryCount = item.gallery?.length ?? 0;
      understandings.push({
        route,
        title: item.title,
        purpose: `Social proof for ${item.category} work — drives trust for similar bookings`,
        businessGoals: ["Build trust", "Demonstrate craft", "Support sales conversations"],
        offers: [item.category, ...(item.relatedServices ?? [])],
        pricing: item.client ? [`Client: ${item.client}`] : [],
        ctas: [{ label: "Book similar session", href: "/book" }],
        seo: {
          title: item.seoTitle || item.title,
          description: item.seoDescription,
          score: item.seoDescription ? 85 : 55,
          issues: !item.seoDescription ? ["Missing meta description"] : [],
        },
        branding: { tone: item.creativeProcess ? "documented process" : "visual-first", consistency: 80, notes: [item.category] },
        imagery: { hasHero: Boolean(item.heroImage || item.image), galleryCount, notes: galleryCount < 3 ? ["Thin gallery"] : [] },
        clientExperience: ["Portfolio proof", item.creativeProcess ? "Process transparency" : "Visual-only"],
        marketingStrategy: views > 30 ? ["Feature in campaigns", "Instagram carousel"] : ["Needs promotion"],
        navigation: baseNav,
        semanticTokens: tokens(item.title, item.category, item.year, "portfolio"),
        tone: "cinematic editorial",
        confidence: views > 0 ? 0.92 : 0.85,
        importance: views > 40 ? 92 : item.portfolioFeatured ? 88 : 68,
        layer: "creative",
        category: "project",
        key: item.slug,
        businessArea: "creative",
        relatedKeys: [
          { layer: "creative", category: "page", key: "portfolio-index", relationType: "part_of" },
          { layer: "business", category: "page", key: "booking", relationType: "converts_to" },
          { layer: "brand", category: "testimonials", key: "social-proof", relationType: "reinforced_by" },
        ],
        issues: [
          ...(!item.image && !item.heroImage ? [issue("ux", "high", "No hero image", item.title, path)] : []),
          ...(!item.seoDescription ? [issue("seo", "low", "Missing SEO", item.title, path)] : []),
        ],
        evidence: [`${views} pageviews (30d)`, item.category, item.year],
        rawSummary: `${item.title} · ${item.category} · ${views} views`,
      });
      continue;
    }

    const volumeMatch = path.match(/^\/sessions\/([^/]+)$/);
    if (volumeMatch && !path.endsWith("/apply")) {
      const vol = volumeBySlug.get(volumeMatch[1]);
      if (vol) {
        const isOpen = vol.status === "applications_open";
        understandings.push({
          route,
          title: `Vol. ${vol.volumeNumber} — ${vol.title}`,
          purpose: isOpen ? "Active casting — accept model applications" : "ÉLEVÉ Sessions editorial volume showcase",
          businessGoals: isOpen ? ["Fill casting", "Build community"] : ["Brand storytelling", "Alumni showcase"],
          offers: [vol.theme, vol.genre].filter(Boolean) as string[],
          pricing: [],
          ctas: isOpen
            ? [{ label: "Apply", href: `/sessions/${vol.slug}/apply` }]
            : [{ label: "View sessions", href: "/sessions" }],
          seo: { title: vol.seoTitle || vol.title, description: vol.seoDescription, score: vol.seoDescription ? 80 : 60, issues: [] },
          branding: { tone: vol.mood || vol.theme || "editorial", consistency: 82, notes: [vol.directorsNote?.slice(0, 80) ?? ""] },
          imagery: { hasHero: Boolean(vol.posterImage || vol.bannerImage), galleryCount: 0, notes: [] },
          clientExperience: ["Session application journey", vol.sessionDate ? `Date: ${vol.sessionDate}` : ""].filter(Boolean),
          marketingStrategy: isOpen ? ["Promote applications", "Social BTS"] : ["Archive showcase"],
          navigation: baseNav,
          semanticTokens: tokens(vol.title, vol.theme, "sessions", `volume-${vol.volumeNumber}`, vol.status),
          tone: "editorial cinematic",
          confidence: vol.published ? 0.94 : 0.72,
          importance: isOpen ? 98 : vol.featured ? 88 : 72,
          layer: "sessions",
          category: "volume",
          key: `vol-${vol.volumeNumber}`,
          businessArea: "sessions",
          relatedKeys: [
            { layer: "sessions", category: "page", key: "sessions-hub", relationType: "part_of" },
            { layer: "sessions", category: "applications", key: "pipeline", relationType: isOpen ? "accepts" : "feeds" },
            ...(vol.volumeNumber > 1
              ? [{ layer: "sessions" as const, category: "volume", key: `vol-${vol.volumeNumber - 1}`, relationType: "follows" }]
              : []),
          ],
          issues: !vol.synopsis ? [issue("missing_content", "medium", "Missing synopsis", vol.title, path)] : [],
          evidence: [`Status: ${vol.status}`, `${vol._count.cast} cast`],
          rawSummary: `${vol.title} · ${vol.status}${isOpen ? " · OPEN" : ""}`,
        });
      }
      continue;
    }

    if (path === "/book" || path === "/admin/bookings-ai") {
      understandings.push({
        route,
        title: path === "/book" ? "Booking page" : "Booking Assistant",
        purpose: "Capture portrait inquiries and forecast revenue",
        businessGoals: ["Lead capture", "Pipeline growth"],
        offers: booking?.serviceTypes ?? [],
        pricing: booking?.budgetRanges ?? [],
        ctas: [{ label: "Submit inquiry", href: "/book" }],
        seo: { score: 70, issues: [] },
        branding: { tone: "conversion-focused", consistency: 75, notes: [] },
        imagery: { hasHero: false, galleryCount: 0, notes: [] },
        clientExperience: ["Inquiry form", "Budget selection"],
        marketingStrategy: ["Primary conversion endpoint"],
        navigation: baseNav,
        semanticTokens: tokens("booking", "inquiry", "revenue"),
        tone: "professional",
        confidence: 0.93,
        importance: 96,
        layer: "business",
        category: "page",
        key: path === "/book" ? "booking" : "bookings-ai",
        businessArea: "sales",
        relatedKeys: [{ layer: "financial", category: "pipeline", key: "pipeline-live", relationType: "feeds" }],
        issues: !booking?.serviceTypes?.length ? [issue("conversion", "high", "No service types", "Booking form incomplete", path)] : [],
        evidence: [`${booking?.serviceTypes?.length ?? 0} service types`],
        rawSummary: "Booking & revenue capture",
      });
      continue;
    }

    if (path.startsWith("/admin/")) {
      const segment = path.replace("/admin/", "") || "dashboard";
      const moduleMap: Record<string, { title: string; purpose: string; area: string; layer: MemoryLayer }> = {
        crm: { title: "CRM", purpose: "Client relationship intelligence & LTV tracking", area: "crm", layer: "crm" },
        pipeline: { title: "Pipeline", purpose: "Sales kanban — move inquiries to revenue", area: "sales", layer: "financial" },
        marketing: { title: "Marketing Studio", purpose: "AI content & campaign generation", area: "marketing", layer: "marketing" },
        memory: { title: "Knowledge Engine", purpose: "ÉLEVÉ AI operating system — platform intelligence", area: "operations", layer: "operational" },
        intelligence: { title: "Executive Intelligence", purpose: "Chief Strategy Officer layer", area: "operations", layer: "business" },
        analytics: { title: "Analytics", purpose: "Traffic & conversion measurement", area: "marketing", layer: "marketing" },
        applications: { title: "Applications", purpose: "Session applicant pipeline", area: "sessions", layer: "sessions" },
        sponsorship: { title: "Sponsorship", purpose: "Partner relationships", area: "sponsors", layer: "sponsor" },
        forms: { title: "Forms", purpose: "Intake form builder", area: "operations", layer: "operational" },
        email: { title: "Email", purpose: "Campaign management", area: "marketing", layer: "marketing" },
        reports: { title: "Reports", purpose: "Business intelligence reports", area: "business", layer: "business" },
      };
      const mod = moduleMap[segment.split("/")[0]] ?? {
        title: segment,
        purpose: `Admin module: ${segment}`,
        area: "operations",
        layer: "operational" as MemoryLayer,
      };
      understandings.push({
        route,
        title: mod.title,
        purpose: mod.purpose,
        businessGoals: ["Operational efficiency"],
        offers: [],
        pricing: [],
        ctas: [],
        seo: { score: 0, issues: [] },
        branding: { tone: "internal", consistency: 100, notes: [] },
        imagery: { hasHero: false, galleryCount: segment === "media" ? mediaCount : 0, notes: [] },
        clientExperience: [],
        marketingStrategy: [],
        navigation: { inbound: [], outbound: [] },
        semanticTokens: tokens(mod.title, segment, "admin"),
        tone: "operational",
        confidence: 0.88,
        importance: segment === "memory" || segment === "intelligence" ? 95 : 60,
        layer: mod.layer,
        category: "module",
        key: segment.replace(/\//g, "-"),
        businessArea: mod.area,
        relatedKeys: [],
        issues: [],
        evidence: [`Admin route ${path}`],
        rawSummary: mod.purpose,
      });
      continue;
    }

    if (path === "/services") {
      understandings.push({
        route,
        title: "Services",
        purpose: "Revenue packages — portrait service offerings with pricing anchors",
        businessGoals: ["Convert to booking", "Clarify deliverables"],
        offers: services.map((s) => s.title),
        pricing: services.map((s) => `${s.title}: from ${s.startingPrice}`),
        ctas: [{ label: "Book", href: "/book" }],
        seo: { score: 76, issues: [] },
        branding: { tone: servicesPage?.hero?.headline ?? "premium", consistency: 85, notes: [] },
        imagery: { hasHero: Boolean(servicesPage?.hero?.image), galleryCount: services.length, notes: [] },
        clientExperience: ["Compare packages", "Understand pricing"],
        marketingStrategy: ["Service-led conversion"],
        navigation: baseNav,
        semanticTokens: tokens("services", "pricing", "packages"),
        tone: "premium service",
        confidence: 0.95,
        importance: 90,
        layer: "brand",
        category: "page",
        key: "services-index",
        businessArea: "revenue",
        relatedKeys: services.slice(0, 4).map((s) => ({
          layer: "brand" as const,
          category: "package",
          key: s.slug,
          relationType: "lists",
        })),
        issues: services.length < 2 ? [issue("missing_content", "medium", "Few services", "Add packages", path)] : [],
        evidence: [`${services.length} packages`],
        rawSummary: `Services · ${services.length} packages`,
      });
      for (const svc of services) {
        understandings.push({
          route: { ...route, path: `/services#${svc.slug}`, segment: svc.slug },
          title: svc.title,
          purpose: "Revenue package — portrait service offering with pricing anchor",
          businessGoals: ["Convert to booking"],
          offers: [svc.title],
          pricing: [`From ${svc.startingPrice}`],
          ctas: [{ label: "Book", href: "/book" }],
          seo: { score: 75, issues: [] },
          branding: { tone: svc.tagline, consistency: 85, notes: [] },
          imagery: { hasHero: Boolean(svc.image), galleryCount: 0, notes: [] },
          clientExperience: ["Package clarity"],
          marketingStrategy: ["Service-led conversion"],
          navigation: baseNav,
          semanticTokens: tokens(svc.title, svc.tagline, "service"),
          tone: "premium service",
          confidence: 0.96,
          importance: svc.featured ? 86 : 72,
          layer: "brand",
          category: "package",
          key: svc.slug,
          businessArea: "revenue",
          relatedKeys: [
            { layer: "brand", category: "page", key: "services-index", relationType: "part_of" },
            { layer: "business", category: "page", key: "booking", relationType: "converts_to" },
          ],
          issues: [],
          evidence: [svc.startingPrice],
          rawSummary: `${svc.title} · ${svc.startingPrice}`,
        });
      }
      continue;
    }

    const serviceMatch = path.match(/^\/services\/([^/]+)$/);
    if (serviceMatch) {
      continue;
    }

    if (path === "/portfolio") {
      understandings.push({
        route,
        title: "Portfolio",
        purpose: "Social proof gallery — primary trust builder",
        businessGoals: ["Trust", "Inspiration", "SEO"],
        offers: portfolioItems.map((p) => p.title).slice(0, 6),
        pricing: [],
        ctas: [{ label: "Book", href: "/book" }],
        seo: { score: 78, issues: [] },
        branding: { tone: "visual portfolio", consistency: 80, notes: [] },
        imagery: { hasHero: Boolean(portfolioPage?.hero?.image), galleryCount: portfolioItems.length, notes: [] },
        clientExperience: ["Browse work", "Compare styles"],
        marketingStrategy: ["Top-of-funnel trust"],
        navigation: baseNav,
        semanticTokens: tokens("portfolio", "social proof", "gallery"),
        tone: "visual",
        confidence: 0.94,
        importance: 88,
        layer: "creative",
        category: "page",
        key: "portfolio-index",
        businessArea: "creative",
        relatedKeys: [{ layer: "business", category: "page", key: "booking", relationType: "converts_to" }],
        issues: portfolioItems.length < 3 ? [issue("missing_content", "medium", "Thin portfolio", "Add projects", path)] : [],
        evidence: [`${portfolioItems.length} projects`, `${views} views`],
        rawSummary: `Portfolio index · ${portfolioItems.length} projects`,
      });
      continue;
    }

    if (path === "/sessions") {
      understandings.push({
        route,
        title: "ÉLEVÉ Sessions Hub",
        purpose: "Editorial session series — community & applications",
        businessGoals: ["Session brand", "Applications", "Community"],
        offers: volumes.map((v) => `Vol ${v.volumeNumber}: ${v.title}`),
        pricing: [],
        ctas: volumes.filter((v) => v.status === "applications_open").map((v) => ({
          label: `Apply Vol ${v.volumeNumber}`,
          href: `/sessions/${v.slug}/apply`,
        })),
        seo: { score: 75, issues: [] },
        branding: { tone: sessionsContent?.tagline ?? "editorial", consistency: 85, notes: [] },
        imagery: { hasHero: Boolean(sessionsContent?.heroImage), galleryCount: volumes.length, notes: [] },
        clientExperience: ["Discover volumes", "Apply to sessions"],
        marketingStrategy: ["Session marketing hub"],
        navigation: baseNav,
        semanticTokens: tokens("sessions", "volume", sessionsContent?.theme),
        tone: "editorial",
        confidence: 0.93,
        importance: 90,
        layer: "sessions",
        category: "page",
        key: "sessions-hub",
        businessArea: "sessions",
        relatedKeys: volumes.map((v) => ({
          layer: "sessions" as const,
          category: "volume",
          key: `vol-${v.volumeNumber}`,
          relationType: "contains",
        })),
        issues: [],
        evidence: [`${volumes.length} volumes`],
        rawSummary: sessionsContent?.tagline ?? "Sessions hub",
      });
      continue;
    }

    understandings.push({
      route,
      title: path,
      purpose: `Discovered route — ${route.segment}`,
      businessGoals: [],
      offers: [],
      pricing: [],
      ctas: [],
      seo: { score: 50, issues: [] },
      branding: { tone: "unknown", consistency: 50, notes: [] },
      imagery: { hasHero: false, galleryCount: 0, notes: [] },
      clientExperience: [],
      marketingStrategy: [],
      navigation: baseNav,
      semanticTokens: tokens(path.replace(/\//g, " ")),
      tone: "neutral",
      confidence: 0.7,
      importance: 45,
      layer: "operational",
      category: "discovered",
      key: path.replace(/\//g, "-").replace(/^-/, "") || "root",
      businessArea: route.kind === "admin" ? "operations" : "brand",
      relatedKeys: [],
      issues: [],
      evidence: [`Auto-discovered from ${route.filePath}`],
      rawSummary: `Discovered: ${path}`,
    });
  }

  if (crm.length) {
    understandings.push({
      route: { path: "/admin/crm", template: "/admin/crm", kind: "admin", segment: "crm", filePath: "data", discoveredAt: new Date().toISOString() },
      title: "CRM Intelligence",
      purpose: "Tracks every client relationship, LTV, and follow-up opportunity",
      businessGoals: ["Retention", "Repeat bookings", "Referrals"],
      offers: [],
      pricing: crm.slice(0, 5).map((c) => `${c.name}: $${c.revenue}`),
      ctas: [],
      seo: { score: 0, issues: [] },
      branding: { tone: "relationship", consistency: 90, notes: [] },
      imagery: { hasHero: false, galleryCount: 0, notes: [] },
      clientExperience: ["Relationship history"],
      marketingStrategy: ["Re-engagement"],
      navigation: { inbound: [], outbound: [] },
      semanticTokens: tokens("crm", "clients", "ltv"),
      tone: "relationship",
      confidence: 0.9,
      importance: 85,
      layer: "crm",
      category: "module",
      key: "crm-overview",
      businessArea: "crm",
      relatedKeys: [{ layer: "business", category: "page", key: "booking", relationType: "tracks" }],
      issues: [],
      evidence: [`${crm.length} contacts`],
      rawSummary: `${crm.length} CRM contacts`,
    });
  }

  if (pipeline) {
    understandings.push({
      route: { path: "/admin/pipeline", template: "/admin/pipeline", kind: "admin", segment: "pipeline", filePath: "data", discoveredAt: new Date().toISOString() },
      title: "Revenue Pipeline",
      purpose: "Open booking value — leading revenue indicator",
      businessGoals: ["Close deals", "Reduce stale inquiries"],
      offers: [],
      pricing: [`$${pipeline.totalValue.toLocaleString()} pipeline`],
      ctas: [],
      seo: { score: 0, issues: [] },
      branding: { tone: "sales", consistency: 100, notes: [] },
      imagery: { hasHero: false, galleryCount: 0, notes: [] },
      clientExperience: [],
      marketingStrategy: [],
      navigation: { inbound: [], outbound: [] },
      semanticTokens: tokens("pipeline", "revenue"),
      tone: "sales",
      confidence: 0.88,
      importance: 92,
      layer: "financial",
      category: "pipeline",
      key: "pipeline-live",
      businessArea: "sales",
      relatedKeys: [{ layer: "business", category: "page", key: "booking", relationType: "fed_by" }],
      issues: [],
      evidence: [`$${pipeline.totalValue.toLocaleString()}`],
      rawSummary: "Pipeline value",
    });
  }

  if (testimonials.length) {
    understandings.push({
      route: { path: "/testimonials", template: "/testimonials", kind: "public", segment: "testimonials", filePath: "data", discoveredAt: new Date().toISOString() },
      title: "Testimonials",
      purpose: "Trust amplification — reduces booking friction",
      businessGoals: ["Trust", "Conversion"],
      offers: [],
      pricing: [],
      ctas: [],
      seo: { score: 60, issues: [] },
      branding: { tone: "social proof", consistency: 80, notes: [] },
      imagery: { hasHero: false, galleryCount: testimonials.length, notes: [] },
      clientExperience: ["Peer validation"],
      marketingStrategy: ["Homepage & booking support"],
      navigation: { inbound: [], outbound: [] },
      semanticTokens: tokens("testimonials", "trust"),
      tone: "authentic",
      confidence: 0.92,
      importance: 72,
      layer: "brand",
      category: "testimonials",
      key: "social-proof",
      businessArea: "brand",
      relatedKeys: [{ layer: "brand", category: "page", key: "homepage", relationType: "supports" }],
      issues: testimonials.length < 3 ? [issue("missing_content", "medium", "Few testimonials", "Add quotes", "/")] : [],
      evidence: [`${testimonials.length} testimonials`],
      rawSummary: `${testimonials.length} testimonials`,
    });
  }

  return understandings;
}

export function understandingToFinding(u: SemanticPageUnderstanding): import("./types").KnowledgeFinding {
  return {
    layer: u.layer,
    category: u.category,
    key: u.key,
    title: u.title,
    summary: u.rawSummary,
    pagePurpose: u.purpose,
    value: {
      purpose: u.purpose,
      businessGoals: u.businessGoals,
      offers: u.offers,
      pricing: u.pricing,
      ctas: u.ctas,
      seo: u.seo,
      branding: u.branding,
      imagery: u.imagery,
      clientExperience: u.clientExperience,
      marketingStrategy: u.marketingStrategy,
      navigation: u.navigation,
      semanticTokens: u.semanticTokens,
      tone: u.tone,
      sourcePage: u.route.path,
      sourceSection: u.route.segment,
      routeKind: u.route.kind,
      discoveredFrom: u.route.filePath,
      pageviews30d: undefined,
    },
    confidence: u.confidence,
    importance: u.importance,
    sourcePage: u.route.path,
    sourceRef: `platform:${u.route.path}`,
    whyItMatters: u.purpose,
    businessArea: u.businessArea,
    evidence: u.evidence,
    relatedKeys: u.relatedKeys,
    issues: u.issues,
    tags: ["platform-scan", "intelligence-os", u.businessArea, ...u.semanticTokens.slice(0, 5)],
  };
}
