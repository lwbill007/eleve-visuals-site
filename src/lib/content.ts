import { prisma } from "./db";
import { parseJsonArray } from "./utils";
import {
  CONTENT_KEYS,
  DEFAULT_ABOUT,
  DEFAULT_BOOKING_OPTIONS,
  DEFAULT_BOOKING_TERMS,
  DEFAULT_BRAND_STORY,
  DEFAULT_CONTACT_PAGE,
  DEFAULT_FAQ,
  DEFAULT_HERO,
  DEFAULT_HOMEPAGE,
  DEFAULT_NAVIGATION,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PAGE_COPY,
  DEFAULT_PORTFOLIO_PAGE,
  DEFAULT_SERVICES_INTRO,
  DEFAULT_SERVICES_PAGE,
  DEFAULT_SESSIONS,
  DEFAULT_SESSIONS_APPLICATION,
  DEFAULT_SITE_CONFIG,
} from "./defaults";
import { mapPortfolioCredits, normalizePortfolioGallery } from "./portfolio-utils";
import type {
  AboutContent,
  AspectRatio,
  BookingOptions,
  BookingTermsContent,
  BrandStory,
  ContactPageContent,
  FaqItem,
  HomepageContent,
  NavigationConfig,
  NotificationSettings,
  HeroContent,
  HomeServiceCard,
  PageCopy,
  PortfolioCategory,
  PortfolioItemDTO,
  PortfolioPageContent,
  ServiceDTO,
  ServicesPageIntro,
  ServicesPageContent,
  SessionsApplicationContent,
  SessionsContent,
  SiteConfig,
  TestimonialDTO,
} from "./types";

async function getJsonContent<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await prisma.siteContent.findUnique({ where: { key } });
    if (!row) return fallback;
    return JSON.parse(row.value) as T;
  } catch (error) {
    console.error(`[content] Falling back for ${key}:`, error);
    return fallback;
  }
}

async function setJsonContent<T>(key: string, value: T) {
  await prisma.siteContent.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
}

async function withDbFallback<T>(
  label: string,
  fallback: T,
  query: () => Promise<T>
): Promise<T> {
  try {
    return await query();
  } catch (error) {
    console.error(`[content] Database fallback for ${label}:`, error);
    return fallback;
  }
}

function mapPortfolioItem(item: {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  client: string | null;
  year: string;
  description: string;
  creativeProcess: string;
  image: string | null;
  imageAlt: string;
  heroImage: string | null;
  heroImageAlt: string;
  aspectRatio: string;
  featured: boolean;
  portfolioFeatured: boolean;
  archived?: boolean;
  sortOrder: number;
  gallery: string;
  btsGallery: string;
  videos: string;
  deliverables: string;
  credits: string;
  relatedServices: string;
  seoTitle: string;
  seoDescription: string;
  published: boolean;
}): PortfolioItemDTO {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    subtitle: item.subtitle,
    category: item.category as PortfolioCategory,
    client: item.client,
    year: item.year,
    description: item.description,
    creativeProcess: item.creativeProcess,
    image: item.image,
    imageAlt: item.imageAlt,
    heroImage: item.heroImage,
    heroImageAlt: item.heroImageAlt,
    aspectRatio: item.aspectRatio as AspectRatio,
    featured: item.featured,
    portfolioFeatured: item.portfolioFeatured,
    archived: item.archived ?? false,
    sortOrder: item.sortOrder,
    gallery: parseJsonArray(item.gallery),
    btsGallery: normalizePortfolioGallery(parseJsonArray(item.btsGallery)),
    videos: parseJsonArray(item.videos),
    deliverables: parseJsonArray(item.deliverables),
    credits: mapPortfolioCredits(item.credits),
    relatedServices: parseJsonArray(item.relatedServices),
    seoTitle: item.seoTitle,
    seoDescription: item.seoDescription,
    published: item.published,
  };
}

function mapService(item: {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  forWhom: string;
  includes: string;
  deliverables?: string;
  faqs?: string;
  startingPrice: string;
  turnaround?: string;
  image: string | null;
  imageAlt: string;
  bannerImage?: string | null;
  thumbnailImage?: string | null;
  featured?: boolean;
  sortOrder: number;
  published: boolean;
  archived?: boolean;
}): ServiceDTO {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    tagline: item.tagline,
    description: item.description,
    forWhom: item.forWhom,
    includes: parseJsonArray(item.includes),
    deliverables: parseJsonArray(item.deliverables ?? "[]"),
    faqs: parseJsonArray(item.faqs ?? "[]"),
    startingPrice: item.startingPrice,
    turnaround: item.turnaround ?? "",
    image: item.image,
    imageAlt: item.imageAlt,
    bannerImage: item.bannerImage ?? null,
    thumbnailImage: item.thumbnailImage ?? null,
    featured: item.featured ?? false,
    sortOrder: item.sortOrder,
    published: item.published,
    archived: item.archived ?? false,
  };
}

function mapTestimonial(item: {
  id: string;
  quote: string;
  name: string;
  role: string;
  image?: string | null;
  imageAlt?: string;
  featured: boolean;
  sortOrder: number;
  published: boolean;
}): TestimonialDTO {
  return {
    id: item.id,
    quote: item.quote,
    name: item.name,
    role: item.role,
    image: item.image ?? null,
    imageAlt: item.imageAlt ?? "",
    featured: item.featured,
    sortOrder: item.sortOrder,
    published: item.published,
  };
}

// Public getters
export async function getSiteConfig(): Promise<SiteConfig> {
  const stored = await getJsonContent(CONTENT_KEYS.siteConfig, DEFAULT_SITE_CONFIG);
  return {
    ...DEFAULT_SITE_CONFIG,
    ...stored,
    brandColors: {
      ...DEFAULT_SITE_CONFIG.brandColors,
      ...(stored.brandColors ?? {}),
    },
  };
}

export async function getHeroContent(): Promise<HeroContent> {
  const stored = await getJsonContent(CONTENT_KEYS.hero, DEFAULT_HERO);
  return { ...DEFAULT_HERO, ...stored };
}

export async function getHomepageContent(): Promise<HomepageContent> {
  const stored = await getJsonContent(CONTENT_KEYS.homepage, DEFAULT_HOMEPAGE);
  return {
    ...DEFAULT_HOMEPAGE,
    ...stored,
    sections: stored.sections?.length ? stored.sections : DEFAULT_HOMEPAGE.sections,
    featuredPortfolioItemId:
      stored.featuredPortfolioItemId ?? DEFAULT_HOMEPAGE.featuredPortfolioItemId,
    trustBar: {
      ...DEFAULT_HOMEPAGE.trustBar,
      ...stored.trustBar,
      stats: stored.trustBar?.stats?.length
        ? stored.trustBar.stats
        : DEFAULT_HOMEPAGE.trustBar.stats,
      featuredTestimonialIds:
        stored.trustBar?.featuredTestimonialIds ??
        DEFAULT_HOMEPAGE.trustBar.featuredTestimonialIds,
    },
    experiment: {
      ...DEFAULT_HOMEPAGE.experiment,
      ...stored.experiment,
    },
    stats: {
      ...DEFAULT_HOMEPAGE.stats,
      ...stored.stats,
      items: stored.stats?.items?.length ? stored.stats.items : DEFAULT_HOMEPAGE.stats.items,
    },
    workFilters: stored.workFilters?.length ? stored.workFilters : DEFAULT_HOMEPAGE.workFilters,
    copy: {
      ...DEFAULT_HOMEPAGE.copy,
      ...stored.copy,
      featuredWork: { ...DEFAULT_HOMEPAGE.copy.featuredWork, ...stored.copy?.featuredWork },
      services: { ...DEFAULT_HOMEPAGE.copy.services, ...stored.copy?.services },
      sessions: { ...DEFAULT_HOMEPAGE.copy.sessions, ...stored.copy?.sessions },
      whyEleve: { ...DEFAULT_HOMEPAGE.copy.whyEleve, ...stored.copy?.whyEleve },
      process: { ...DEFAULT_HOMEPAGE.copy.process, ...stored.copy?.process },
      testimonials: { ...DEFAULT_HOMEPAGE.copy.testimonials, ...stored.copy?.testimonials },
      cta: { ...DEFAULT_HOMEPAGE.copy.cta, ...stored.copy?.cta },
    },
    processSteps: stored.processSteps?.length ? stored.processSteps : DEFAULT_HOMEPAGE.processSteps,
    whyPillars: stored.whyPillars?.length ? stored.whyPillars : DEFAULT_HOMEPAGE.whyPillars,
  };
}

export async function getNavigationConfig(): Promise<NavigationConfig> {
  const stored = await getJsonContent(CONTENT_KEYS.navigation, DEFAULT_NAVIGATION);
  return {
    ...DEFAULT_NAVIGATION,
    ...stored,
    navLinks: stored.navLinks?.length ? stored.navLinks : DEFAULT_NAVIGATION.navLinks,
    footerLinks: stored.footerLinks?.length
      ? stored.footerLinks
      : DEFAULT_NAVIGATION.footerLinks,
  };
}

export async function getBrandStory(): Promise<BrandStory> {
  return getJsonContent(CONTENT_KEYS.brandStory, DEFAULT_BRAND_STORY);
}

export async function getFaqItems(): Promise<FaqItem[]> {
  return getJsonContent(CONTENT_KEYS.faq, DEFAULT_FAQ);
}

export async function getContactPage(): Promise<ContactPageContent> {
  return getJsonContent(CONTENT_KEYS.contactPage, DEFAULT_CONTACT_PAGE);
}

export async function getAboutContent(): Promise<AboutContent> {
  return getJsonContent(CONTENT_KEYS.about, DEFAULT_ABOUT);
}

export async function getSessionsContent(): Promise<SessionsContent> {
  return getJsonContent(CONTENT_KEYS.sessions, DEFAULT_SESSIONS);
}

export async function getSessionsApplicationContent(): Promise<SessionsApplicationContent> {
  return getJsonContent(CONTENT_KEYS.sessionsApplication, DEFAULT_SESSIONS_APPLICATION);
}

export async function getServicesIntro(): Promise<ServicesPageIntro> {
  return getJsonContent(CONTENT_KEYS.servicesIntro, DEFAULT_SERVICES_INTRO);
}

export async function getServicesPageContent(): Promise<ServicesPageContent> {
  const content = await getJsonContent(CONTENT_KEYS.servicesPage, DEFAULT_SERVICES_PAGE);
  const intro = await getServicesIntro();
  return {
    ...content,
    hero: {
      ...content.hero,
      headline: intro.headline || content.hero.headline,
      subheadline: intro.subheadline || content.hero.subheadline,
    },
  };
}

export async function getBookingOptions(): Promise<BookingOptions> {
  const stored = await getJsonContent(CONTENT_KEYS.bookingOptions, DEFAULT_BOOKING_OPTIONS);
  return {
    ...DEFAULT_BOOKING_OPTIONS,
    ...stored,
    serviceTypes: stored.serviceTypes?.length
      ? stored.serviceTypes
      : DEFAULT_BOOKING_OPTIONS.serviceTypes,
    sessionSettings: stored.sessionSettings?.length
      ? stored.sessionSettings
      : DEFAULT_BOOKING_OPTIONS.sessionSettings,
    durations: stored.durations?.length ? stored.durations : DEFAULT_BOOKING_OPTIONS.durations,
    budgetRanges: stored.budgetRanges?.length
      ? stored.budgetRanges
      : DEFAULT_BOOKING_OPTIONS.budgetRanges,
    deliverables: stored.deliverables?.length
      ? stored.deliverables
      : DEFAULT_BOOKING_OPTIONS.deliverables,
    referralSources: stored.referralSources?.length
      ? stored.referralSources
      : DEFAULT_BOOKING_OPTIONS.referralSources,
  };
}

export async function getBookingTerms(): Promise<BookingTermsContent> {
  return getJsonContent(CONTENT_KEYS.bookingTerms, DEFAULT_BOOKING_TERMS);
}

export async function getPageCopy(): Promise<PageCopy> {
  return getJsonContent(CONTENT_KEYS.pageCopy, DEFAULT_PAGE_COPY);
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const stored = await getJsonContent(
    CONTENT_KEYS.notificationSettings,
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const merged = { ...DEFAULT_NOTIFICATION_SETTINGS, ...stored };

  // Backward compatibility: migrate the legacy single email into the array.
  let notificationEmails = Array.isArray(merged.notificationEmails)
    ? merged.notificationEmails.filter((e) => typeof e === "string" && e.trim())
    : [];
  if (notificationEmails.length === 0 && merged.notificationEmail?.trim()) {
    notificationEmails = [merged.notificationEmail.trim()];
  }

  return {
    ...merged,
    notificationEmails,
    digestEmails: Array.isArray(merged.digestEmails)
      ? merged.digestEmails.filter((e) => typeof e === "string" && e.trim())
      : [],
    webhooks: Array.isArray(merged.webhooks)
      ? merged.webhooks.filter((w) => w && typeof w.url === "string")
      : [],
  };
}

export async function getPortfolioPageContent(): Promise<PortfolioPageContent> {
  const stored = await getJsonContent(CONTENT_KEYS.portfolioPage, DEFAULT_PORTFOLIO_PAGE);
  return {
    ...DEFAULT_PORTFOLIO_PAGE,
    ...stored,
    hero: { ...DEFAULT_PORTFOLIO_PAGE.hero, ...stored.hero },
    emptyState: { ...DEFAULT_PORTFOLIO_PAGE.emptyState, ...stored.emptyState },
    stats: stored.stats ?? [],
    categories: stored.categories?.length ? stored.categories : DEFAULT_PORTFOLIO_PAGE.categories,
  };
}

export async function getPortfolioItems(publishedOnly = true): Promise<PortfolioItemDTO[]> {
  return withDbFallback("portfolio items", [], async () => {
    const items = await prisma.portfolioItem.findMany({
      where: publishedOnly ? { published: true, archived: false } : undefined,
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return items.map(mapPortfolioItem);
  });
}

export async function getFeaturedPortfolio(): Promise<PortfolioItemDTO[]> {
  return withDbFallback("featured portfolio", [], async () => {
    const items = await prisma.portfolioItem.findMany({
      where: { published: true, featured: true, archived: false },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 8,
    });
    return items.map(mapPortfolioItem);
  });
}

export async function getPortfolioItemById(id: string): Promise<PortfolioItemDTO | null> {
  return withDbFallback("portfolio item", null, async () => {
    const item = await prisma.portfolioItem.findUnique({ where: { id } });
    return item ? mapPortfolioItem(item) : null;
  });
}

export async function getServices(publishedOnly = true): Promise<ServiceDTO[]> {
  return withDbFallback("services", [], async () => {
    const items = await prisma.service.findMany({
      where: publishedOnly ? { published: true, archived: false } : undefined,
      orderBy: { sortOrder: "asc" },
    });
    return items.map(mapService);
  });
}

export async function getHomeServices(): Promise<HomeServiceCard[]> {
  const services = await getServices(true);
  return services.slice(0, 4).map((s) => ({
    title: s.title,
    description: s.tagline,
    href: `/services#${s.slug}`,
  }));
}

export async function getTestimonials(publishedOnly = true): Promise<TestimonialDTO[]> {
  return withDbFallback("testimonials", [], async () => {
    const items = await prisma.testimonial.findMany({
      where: publishedOnly ? { published: true } : undefined,
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
    });
    return items.map(mapTestimonial);
  });
}

export async function getFeaturedTestimonials(): Promise<TestimonialDTO[]> {
  return withDbFallback("featured testimonials", [], async () => {
    const items = await prisma.testimonial.findMany({
      where: { published: true, featured: true },
      orderBy: { sortOrder: "asc" },
    });
    return items.map(mapTestimonial);
  });
}

// Admin setters
export const contentSetters = {
  siteConfig: (v: SiteConfig) => setJsonContent(CONTENT_KEYS.siteConfig, v),
  hero: (v: HeroContent) => setJsonContent(CONTENT_KEYS.hero, v),
  brandStory: (v: BrandStory) => setJsonContent(CONTENT_KEYS.brandStory, v),
  faq: (v: FaqItem[]) => setJsonContent(CONTENT_KEYS.faq, v),
  contactPage: (v: ContactPageContent) => setJsonContent(CONTENT_KEYS.contactPage, v),
  about: (v: AboutContent) => setJsonContent(CONTENT_KEYS.about, v),
  sessions: (v: SessionsContent) => setJsonContent(CONTENT_KEYS.sessions, v),
  sessionsApplication: (v: SessionsApplicationContent) =>
    setJsonContent(CONTENT_KEYS.sessionsApplication, v),
  servicesIntro: (v: ServicesPageIntro) => setJsonContent(CONTENT_KEYS.servicesIntro, v),
  servicesPage: (v: ServicesPageContent) => setJsonContent(CONTENT_KEYS.servicesPage, v),
  bookingOptions: (v: BookingOptions) => setJsonContent(CONTENT_KEYS.bookingOptions, v),
  bookingTerms: (v: BookingTermsContent) => setJsonContent(CONTENT_KEYS.bookingTerms, v),
  pageCopy: (v: PageCopy) => setJsonContent(CONTENT_KEYS.pageCopy, v),
  homepage: (v: HomepageContent) => setJsonContent(CONTENT_KEYS.homepage, v),
  navigation: (v: NavigationConfig) => setJsonContent(CONTENT_KEYS.navigation, v),
  portfolioPage: (v: PortfolioPageContent) => setJsonContent(CONTENT_KEYS.portfolioPage, v),
  notificationSettings: (v: NotificationSettings) =>
    setJsonContent(CONTENT_KEYS.notificationSettings, v),
};

export { mapPortfolioItem, mapService, mapTestimonial };
