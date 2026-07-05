import {
  getAboutContent,
  getBookingOptions,
  getContactPage,
  getHeroContent,
  getHomepageContent,
  getNavigationConfig,
  getPortfolioItems,
  getPortfolioPageContent,
  getServices,
  getServicesPageContent,
  getSessionsApplicationContent,
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
import type { KnowledgeFinding, PlatformIssue } from "./types";
import type { MemoryLayer } from "../types";

function issue(
  type: PlatformIssue["type"],
  severity: PlatformIssue["severity"],
  title: string,
  detail: string,
  page: string
): PlatformIssue {
  return { type, severity, title, detail, page };
}

function finding(
  partial: Omit<KnowledgeFinding, "issues" | "relatedKeys" | "tags" | "evidence"> & {
    issues?: PlatformIssue[];
    relatedKeys?: KnowledgeFinding["relatedKeys"];
    tags?: string[];
    evidence?: string[];
  }
): KnowledgeFinding {
  return {
    issues: partial.issues ?? [],
    relatedKeys: partial.relatedKeys ?? [],
    tags: partial.tags ?? ["platform-scan"],
    evidence: partial.evidence ?? [],
    ...partial,
  };
}

export async function scanEntirePlatform(): Promise<{
  findings: KnowledgeFinding[];
  pagesScanned: string[];
}> {
  const pagesScanned: string[] = [];
  const findings: KnowledgeFinding[] = [];

  const [
    site,
    hero,
    homepage,
    nav,
    portfolioPage,
    portfolioItems,
    services,
    servicesPage,
    booking,
    contact,
    sessionsContent,
    sessionsApp,
    about,
    testimonials,
    volumes,
    analytics30,
    dashboard,
    pipeline,
    crm,
    sponsors,
    mediaCount,
    automationCount,
    submissionCounts,
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
    getSessionsApplicationContent().catch(() => null),
    getAboutContent().catch(() => null),
    getTestimonials(true).catch(() => []),
    prisma.sessionVolume.findMany({ where: { archived: false }, orderBy: { volumeNumber: "asc" }, include: { _count: { select: { cast: true } } } }).catch(() => []),
    getAnalyticsSummary(30).catch(() => null),
    getAdminDashboardOS().catch(() => null),
    getAdminPipeline().catch(() => null),
    getAdminCRMContacts().catch(() => []),
    getSponsorMetrics().catch(() => null),
    prisma.mediaAsset.count().catch(() => 0),
    prisma.aIAutomation.count().catch(() => 0),
    prisma.submission.groupBy({ by: ["type"], _count: { id: true } }).catch(() => []),
  ]);

  // ── Homepage ──
  pagesScanned.push("/");
  if (site && hero && homepage) {
    const homepageIssues: PlatformIssue[] = [];
    if (!hero.headline?.trim()) homepageIssues.push(issue("missing_content", "high", "Missing hero headline", "Homepage hero has no headline", "/"));
    if (!hero.primaryCta?.label?.trim()) homepageIssues.push(issue("conversion", "medium", "Missing primary CTA", "No clear booking CTA on homepage", "/"));
    const conv = analytics30?.totals.conversionRate ?? 0;
    if (conv < 2) homepageIssues.push(issue("conversion", "medium", "Low site conversion", `${conv}% conversion — homepage may need stronger CTA`, "/"));

    findings.push(
      finding({
        layer: "brand",
        category: "page",
        key: "homepage",
        title: "Homepage",
        summary: `Primary entry — promotes ${hero.primaryCta?.label || "bookings"} · ${site.tagline}`,
        pagePurpose: "Drive portrait bookings and showcase ÉLEVÉ brand positioning",
        value: {
          headline: hero.headline,
          ctaLabel: hero.primaryCta?.label,
          ctaHref: hero.primaryCta?.href,
          featuredSections: homepage.sections?.length ?? 0,
          conversionRate30d: conv,
        },
        confidence: 0.95,
        importance: 95,
        sourcePage: "/",
        sourceRef: "platform:/",
        whyItMatters: "Homepage is the primary conversion funnel — controls first impression and booking intent",
        businessArea: "marketing",
        evidence: [`Hero: "${hero.headline?.slice(0, 60)}"`, `CTA: ${hero.primaryCta?.label}`, `${conv}% conversion`],
        issues: homepageIssues,
        relatedKeys: [{ layer: "brand", category: "identity", key: "site-config", relationType: "part_of" }],
        tags: ["homepage", "conversion"],
      })
    );
  }

  // ── Navigation ──
  pagesScanned.push("/navigation");
  if (nav) {
    findings.push(
      finding({
        layer: "brand",
        category: "navigation",
        key: "main-nav",
        title: "Site navigation",
        summary: `${nav.navLinks?.length ?? 0} nav items — structures how visitors discover portfolio, sessions, and booking`,
        pagePurpose: "Information architecture — routes traffic to revenue and social proof pages",
        value: { items: nav.navLinks, footer: nav.footerLinks },
        confidence: 0.98,
        importance: 75,
        sourcePage: "/navigation",
        sourceRef: "platform:/navigation",
        whyItMatters: "Navigation determines discovery path for bookings vs sessions vs portfolio",
        businessArea: "brand",
        evidence: nav.navLinks?.map((i) => `${i.label} → ${i.href}`) ?? [],
      })
    );
  }

  // ── Portfolio ──
  pagesScanned.push("/portfolio");
  if (portfolioPage) {
    findings.push(
      finding({
        layer: "creative",
        category: "page",
        key: "portfolio-index",
        title: "Portfolio index",
        summary: `${portfolioItems.length} published projects — social proof and conversion driver`,
        pagePurpose: "Social proof — demonstrates craft quality to convert visitors into booking inquiries",
        value: { projectCount: portfolioItems.length, intro: portfolioPage.hero?.description?.slice(0, 200) },
        confidence: 0.95,
        importance: 88,
        sourcePage: "/portfolio",
        sourceRef: "platform:/portfolio",
        whyItMatters: "Portfolio is the primary trust builder for premium portrait clients",
        businessArea: "creative",
        evidence: [`${portfolioItems.length} live projects`],
        issues: portfolioItems.length < 3 ? [issue("missing_content", "medium", "Thin portfolio", "Fewer than 3 projects — add work for credibility", "/portfolio")] : [],
      })
    );
  }

  for (const item of portfolioItems.slice(0, 24)) {
    const path = `/portfolio/${item.slug}`;
    pagesScanned.push(path);
    const views = analytics30?.topPages.find((p) => p.path === path)?.views ?? 0;
    const itemIssues: PlatformIssue[] = [];
    if (!item.description?.trim()) itemIssues.push(issue("missing_content", "medium", "Missing description", item.title, path));
    if (!item.image && !item.heroImage) itemIssues.push(issue("ux", "high", "No hero image", "Project lacks visual anchor", path));
    if (!item.seoDescription?.trim()) itemIssues.push(issue("seo", "low", "Missing SEO description", "Add meta description for search", path));

    findings.push(
      finding({
        layer: "creative",
        category: "project",
        key: item.slug,
        title: item.title,
        summary: `${item.category} · ${item.year}${views ? ` · ${views} views` : ""} — portfolio social proof`,
        pagePurpose: "Individual portfolio case study — builds trust for similar client bookings",
        value: {
          slug: item.slug,
          category: item.category,
          year: item.year,
          client: item.client,
          featured: item.portfolioFeatured || item.featured,
          pageviews30d: views,
          hasGallery: Boolean(item.gallery?.length),
          creativeProcess: Boolean(item.creativeProcess),
        },
        confidence: views > 0 ? 0.92 : 0.85,
        importance: views > 40 ? 90 : item.portfolioFeatured ? 85 : 65,
        sourcePage: path,
        sourceRef: `platform:${path}`,
        whyItMatters: views > 40 ? `${item.title} is a top traffic driver — feature in marketing` : `Portfolio piece supports ${item.category} positioning`,
        businessArea: "creative",
        evidence: [`${views} pageviews (30d)`, item.category, item.year],
        issues: itemIssues,
        relatedKeys: [{ layer: "creative", category: "page", key: "portfolio-index", relationType: "part_of" }],
        tags: [item.category, "portfolio"],
      })
    );
  }

  // ── Services ──
  pagesScanned.push("/services");
  for (const svc of services) {
    const path = `/services/${svc.slug}`;
    pagesScanned.push(path);
    findings.push(
      finding({
        layer: "brand",
        category: "package",
        key: svc.slug,
        title: svc.title,
        summary: `${svc.tagline} · from ${svc.startingPrice} — revenue offering`,
        pagePurpose: "Revenue driver — packages portrait services with pricing anchor",
        value: {
          slug: svc.slug,
          tagline: svc.tagline,
          startingPrice: svc.startingPrice,
          turnaround: svc.turnaround,
          featured: svc.featured,
        },
        confidence: 0.98,
        importance: svc.featured ? 88 : 72,
        sourcePage: path,
        sourceRef: `platform:${path}`,
        whyItMatters: "Services page converts interest into booked sessions — pricing clarity matters",
        businessArea: "revenue",
        evidence: [`From ${svc.startingPrice}`, svc.tagline],
        relatedKeys: [{ layer: "brand", category: "page", key: "homepage", relationType: "promotes" }],
        tags: ["services", "revenue"],
      })
    );
  }

  if (servicesPage) {
    findings.push(
      finding({
        layer: "brand",
        category: "page",
        key: "services-index",
        title: "Services page",
        summary: `${services.length} offerings — primary revenue catalog`,
        pagePurpose: "Package comparison and booking pathway for portrait services",
        value: { serviceCount: services.length },
        confidence: 0.95,
        importance: 85,
        sourcePage: "/services",
        sourceRef: "platform:/services",
        whyItMatters: "Services index organizes revenue offerings for client decision-making",
        businessArea: "revenue",
        evidence: [`${services.length} services listed`],
      })
    );
  }

  // ── Booking ──
  pagesScanned.push("/book");
  if (booking) {
    const bookingIssues: PlatformIssue[] = [];
    if (!booking.serviceTypes?.length) bookingIssues.push(issue("conversion", "high", "No service types", "Booking form needs service options", "/book"));
    findings.push(
      finding({
        layer: "business",
        category: "page",
        key: "booking",
        title: "Booking page",
        summary: `Inquiry capture — ${booking.serviceTypes?.length ?? 0} service types · drives pipeline revenue`,
        pagePurpose: "Primary lead capture — converts visitors into booking submissions",
        value: { serviceTypeCount: booking.serviceTypes?.length ?? 0, budgetRanges: booking.budgetRanges?.length ?? 0 },
        confidence: 0.95,
        importance: 95,
        sourcePage: "/book",
        sourceRef: "platform:/book",
        whyItMatters: "Every booking inquiry enters pipeline — form UX directly impacts revenue",
        businessArea: "sales",
        evidence: [`${booking.serviceTypes?.length ?? 0} service types`],
        issues: bookingIssues,
        relatedKeys: [{ layer: "financial", category: "pipeline", key: "pipeline-live", relationType: "feeds" }],
        tags: ["booking", "conversion"],
      })
    );
  }

  // ── Contact ──
  pagesScanned.push("/contact");
  if (contact) {
    findings.push(
      finding({
        layer: "brand",
        category: "page",
        key: "contact",
        title: "Contact page",
        summary: "General inquiries and relationship entry point",
        pagePurpose: "Capture non-booking inquiries and brand questions",
        value: { hasForm: true },
        confidence: 0.9,
        importance: 60,
        sourcePage: "/contact",
        sourceRef: "platform:/contact",
        whyItMatters: "Contact form feeds CRM with warm leads",
        businessArea: "crm",
        evidence: ["Contact form active"],
      })
    );
  }

  // ── Sessions Hub & Volumes ──
  pagesScanned.push("/sessions");
  if (sessionsContent) {
    findings.push(
      finding({
        layer: "sessions",
        category: "page",
        key: "sessions-hub",
        title: "ÉLEVÉ Sessions Hub",
        summary: `${volumes.length} volumes · editorial session series brand`,
        pagePurpose: "Showcase ÉLEVÉ Sessions editorial volumes and drive applications",
        value: { volumeCount: volumes.length, tagline: sessionsContent.tagline?.slice(0, 150) },
        confidence: 0.95,
        importance: 90,
        sourcePage: "/sessions",
        sourceRef: "platform:/sessions",
        whyItMatters: "Sessions Hub is the brand flagship — drives applications and community",
        businessArea: "sessions",
        evidence: [`${volumes.length} volumes`],
      })
    );
  }

  for (const vol of volumes) {
    const path = `/sessions/${vol.slug}`;
    pagesScanned.push(path);
    const isOpen = vol.status === "applications_open";
    const volIssues: PlatformIssue[] = [];
    if (!vol.synopsis?.trim()) volIssues.push(issue("missing_content", "medium", "Missing synopsis", vol.title, path));
    if (!vol.posterImage) volIssues.push(issue("ux", "medium", "No poster image", "Volume needs poster for shareability", path));
    if (isOpen && !vol.applicationDeadline) volIssues.push(issue("conversion", "low", "No application deadline", "Deadline creates urgency", path));

    findings.push(
      finding({
        layer: "sessions",
        category: "volume",
        key: `vol-${vol.volumeNumber}`,
        title: `Vol. ${vol.volumeNumber} — ${vol.title}`,
        summary: `${vol.theme || vol.genre || "Session"} · status: ${vol.status}${isOpen ? " · APPLICATIONS OPEN" : ""} · ${vol._count.cast} cast`,
        pagePurpose: isOpen
          ? "Active casting volume — accepts model applications"
          : "Published session volume — brand storytelling and alumni showcase",
        value: {
          volumeNumber: vol.volumeNumber,
          slug: vol.slug,
          title: vol.title,
          theme: vol.theme,
          status: vol.status,
          published: vol.published,
          applicationsOpen: isOpen,
          castCount: vol._count.cast,
          sessionDate: vol.sessionDate,
        },
        confidence: vol.published ? 0.94 : 0.75,
        importance: isOpen ? 98 : vol.featured ? 88 : 70,
        sourcePage: path,
        sourceRef: `platform:${path}`,
        whyItMatters: isOpen
          ? `Volume ${vol.volumeNumber} applications are open — prioritize promotion`
          : `${vol.title} belongs to ÉLEVÉ Sessions Vol. ${vol.volumeNumber}`,
        businessArea: "sessions",
        evidence: [`Status: ${vol.status}`, `${vol._count.cast} cast members`],
        issues: volIssues,
        relatedKeys: [
          { layer: "sessions", category: "page", key: "sessions-hub", relationType: "part_of" },
          ...(vol.volumeNumber > 1
            ? [{
                layer: "sessions" as MemoryLayer,
                category: "volume",
                key: `vol-${vol.volumeNumber - 1}`,
                relationType: "follows",
              }]
            : []),
        ],
        tags: ["sessions", vol.theme, vol.status].filter(Boolean) as string[],
      })
    );
  }

  // ── Applications ──
  pagesScanned.push("/admin/applications");
  const appCount = submissionCounts.find((s) => s.type === "session")?._count.id ?? 0;
  findings.push(
    finding({
      layer: "sessions",
      category: "applications",
      key: "pipeline",
      title: "Session applications",
      summary: `${appCount} total applications in system`,
      pagePurpose: "Applicant pipeline for ÉLEVÉ Sessions casting",
      value: { totalApplications: appCount },
      confidence: 0.95,
      importance: 80,
      sourcePage: "/admin/applications",
      sourceRef: "platform:/admin/applications",
      whyItMatters: "Application volume indicates session marketing effectiveness",
      businessArea: "sessions",
      evidence: [`${appCount} applications`],
    })
  );

  // ── Testimonials ──
  pagesScanned.push("/testimonials");
  findings.push(
    finding({
      layer: "brand",
      category: "testimonials",
      key: "social-proof",
      title: "Testimonials",
      summary: `${testimonials.length} published testimonials — trust amplification`,
      pagePurpose: "Increase trust and conversion through client social proof",
      value: { count: testimonials.length, featured: testimonials.filter((t) => t.featured).length },
      confidence: 0.95,
      importance: testimonials.length >= 5 ? 75 : 55,
      sourcePage: "/",
      sourceRef: "platform:/testimonials",
      whyItMatters: "Testimonials reduce booking friction for premium portrait clients",
      businessArea: "brand",
      evidence: [`${testimonials.length} testimonials`],
      issues: testimonials.length < 3 ? [issue("missing_content", "medium", "Few testimonials", "Add client quotes for trust", "/")] : [],
      relatedKeys: [{ layer: "brand", category: "page", key: "homepage", relationType: "supports" }],
    })
  );

  // ── About ──
  pagesScanned.push("/about");
  if (about) {
    findings.push(
      finding({
        layer: "brand",
        category: "page",
        key: "about",
        title: "About page",
        summary: "Brand story and founder narrative",
        pagePurpose: "Build emotional connection and premium positioning",
        value: { hasStory: (about.story?.length ?? 0) > 0 },
        confidence: 0.9,
        importance: 65,
        sourcePage: "/about",
        sourceRef: "platform:/about",
        whyItMatters: "About page humanizes the brand for high-touch portrait clients",
        businessArea: "brand",
        evidence: ["About content present"],
      })
    );
  }

  // ── CRM ──
  pagesScanned.push("/admin/crm");
  const vipClients = crm.filter((c) => c.status === "vip" || c.revenue > 2000).length;
  findings.push(
    finding({
      layer: "crm",
      category: "module",
      key: "crm-overview",
      title: "CRM",
      summary: `${crm.length} contacts · ${vipClients} high-value · tracks client relationships`,
      pagePurpose: "Relationship intelligence — LTV, follow-ups, and client history",
      value: { contactCount: crm.length, vipClients, returning: crm.filter((c) => c.bookings > 1).length },
      confidence: 0.92,
      importance: 85,
      sourcePage: "/admin/crm",
      sourceRef: "platform:/admin/crm",
      whyItMatters: "CRM tracks relationships that drive repeat bookings and referrals",
      businessArea: "crm",
      evidence: [`${crm.length} contacts`, `${vipClients} VIP/high-value`],
      relatedKeys: [{ layer: "business", category: "page", key: "booking", relationType: "tracks" }],
    })
  );

  // ── Pipeline ──
  pagesScanned.push("/admin/pipeline");
  if (pipeline) {
    findings.push(
      finding({
        layer: "financial",
        category: "pipeline",
        key: "pipeline-live",
        title: "Lead pipeline",
        summary: `$${pipeline.totalValue.toLocaleString()} estimated · kanban on submissions`,
        pagePurpose: "Sales pipeline — moves inquiries toward booked revenue",
        value: {
          totalValue: pipeline.totalValue,
          columns: pipeline.columns.map((c) => ({ id: c.id, count: c.items.length })),
        },
        confidence: 0.88,
        importance: 92,
        sourcePage: "/admin/pipeline",
        sourceRef: "platform:/admin/pipeline",
        whyItMatters: "Pipeline value is the leading indicator of near-term revenue",
        businessArea: "sales",
        evidence: [`$${pipeline.totalValue.toLocaleString()} pipeline`],
        relatedKeys: [{ layer: "business", category: "page", key: "booking", relationType: "fed_by" }],
      })
    );
  }

  // ── Analytics ──
  pagesScanned.push("/admin/analytics");
  if (analytics30) {
    findings.push(
      finding({
        layer: "marketing",
        category: "analytics",
        key: "site-analytics-30d",
        title: "Website analytics",
        summary: `${analytics30.totals.pageviews} views · ${analytics30.totals.conversionRate}% conversion`,
        pagePurpose: "Measure traffic quality and conversion performance",
        value: {
          pageviews: analytics30.totals.pageviews,
          conversionRate: analytics30.totals.conversionRate,
          topPages: analytics30.topPages.slice(0, 8),
          topSources: analytics30.topSources.slice(0, 5),
        },
        confidence: 0.9,
        importance: 80,
        sourcePage: "/admin/analytics",
        sourceRef: "platform:/admin/analytics",
        whyItMatters: "Analytics reveal which pages and channels drive bookings",
        businessArea: "marketing",
        evidence: analytics30.topPages.slice(0, 3).map((p) => `${p.path}: ${p.views} views`),
      })
    );
  }

  // ── Marketing / Email / Reports (modules) ──
  for (const mod of [
    { path: "/admin/marketing", key: "marketing-studio", title: "Marketing Studio", area: "marketing" },
    { path: "/admin/email", key: "email", title: "Email campaigns", area: "marketing" },
    { path: "/admin/reports", key: "reports", title: "BI Reports", area: "business" },
    { path: "/admin/media", key: "media", title: "Media Library", area: "creative" },
    { path: "/admin/settings", key: "settings", title: "Settings", area: "operations" },
    { path: "/admin/content-hub", key: "content-hub", title: "Content Hub", area: "marketing" },
  ] as const) {
    pagesScanned.push(mod.path);
    findings.push(
      finding({
        layer: mod.area === "marketing" ? "marketing" : mod.area === "creative" ? "creative" : mod.area === "business" ? "business" : "operational",
        category: "module",
        key: mod.key,
        title: mod.title,
        summary: `Admin module — ${mod.path}`,
        pagePurpose: `ÉLEVÉ OS module for ${mod.title.toLowerCase()}`,
        value: {
          adminPath: mod.path,
          mediaAssets: mod.key === "media" ? mediaCount : undefined,
          automations: mod.key === "marketing-studio" ? automationCount : undefined,
        },
        confidence: 0.85,
        importance: 55,
        sourcePage: mod.path,
        sourceRef: `platform:${mod.path}`,
        whyItMatters: `${mod.title} supports ${mod.area} operations`,
        businessArea: mod.area,
        evidence: [`Module registered at ${mod.path}`],
      })
    );
  }

  // ── Sponsors ──
  pagesScanned.push("/admin/sponsorship");
  if (sponsors) {
    findings.push(
      finding({
        layer: "sponsor",
        category: "partnerships",
        key: "sponsor-overview",
        title: "Sponsorship",
        summary: `Sponsor partnerships · session volume integrations`,
        pagePurpose: "Track sponsor relationships and partnership deliverables",
        value: sponsors as unknown as Record<string, unknown>,
        confidence: 0.8,
        importance: 65,
        sourcePage: "/admin/sponsorship",
        sourceRef: "platform:/admin/sponsorship",
        whyItMatters: "Sponsors belong to partnerships — separate from client revenue",
        businessArea: "sponsors",
        evidence: ["Sponsor metrics from sessions data"],
      })
    );
  }

  // ── Dashboard OS ──
  pagesScanned.push("/admin");
  if (dashboard) {
    findings.push(
      finding({
        layer: "business",
        category: "dashboard",
        key: "command-center",
        title: "Executive Command Center",
        summary: `${dashboard.metrics.pendingTasks} pending tasks · business pulse`,
        pagePurpose: "Executive overview — KPIs, activity, and priorities",
        value: {
          pendingTasks: dashboard.metrics.pendingTasks,
          leads: dashboard.metrics.leads,
          bookings: dashboard.metrics.bookings,
          applications: dashboard.metrics.applications,
        },
        confidence: 0.95,
        importance: 85,
        sourcePage: "/admin",
        sourceRef: "platform:/admin",
        whyItMatters: "Command center aggregates cross-module business health",
        businessArea: "operations",
        evidence: [`${dashboard.metrics.pendingTasks} pending tasks`],
      })
    );
  }

  // ── Site identity ──
  if (site) {
    findings.push(
      finding({
        layer: "brand",
        category: "identity",
        key: "site-config",
        title: "ÉLEVÉ brand identity",
        summary: `${site.name} — ${site.tagline}`,
        pagePurpose: "Core brand positioning across all touchpoints",
        value: { name: site.name, tagline: site.tagline, instagram: site.instagram, location: site.location },
        confidence: 1,
        importance: 98,
        sourcePage: "/admin/settings",
        sourceRef: "platform:/admin/settings",
        whyItMatters: "Brand consistency across portfolio, sessions, and marketing",
        businessArea: "brand",
        evidence: [site.tagline, site.location].filter(Boolean) as string[],
        tags: ["brand", "identity"],
      })
    );
  }

  // ── Cross-cutting: duplicate detection ──
  const titles = new Map<string, string>();
  for (const f of findings) {
    const norm = f.title.toLowerCase().trim();
    if (titles.has(norm) && titles.get(norm) !== f.sourcePage) {
      f.issues.push(
        issue("duplicate", "low", "Similar title across pages", `Also on ${titles.get(norm)}`, f.sourcePage)
      );
    }
    titles.set(norm, f.sourcePage);
  }

  return { findings, pagesScanned: [...new Set(pagesScanned)] };
}
