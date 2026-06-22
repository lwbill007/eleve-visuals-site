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
  DEFAULT_PAGE_COPY,
  DEFAULT_SERVICES_INTRO,
  DEFAULT_SERVICES_PAGE,
  DEFAULT_SESSIONS,
  DEFAULT_SESSIONS_APPLICATION,
  DEFAULT_SITE_CONFIG,
} from "./defaults";
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
  HeroContent,
  HomeServiceCard,
  PageCopy,
  PortfolioCategory,
  PortfolioItemDTO,
  ServiceDTO,
  ServicesPageIntro,
  ServicesPageContent,
  SessionsApplicationContent,
  SessionsContent,
  SiteConfig,
  TestimonialDTO,
} from "./types";

async function getJsonContent<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.siteContent.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
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

function mapPortfolioItem(item: {
  id: string;
  title: string;
  category: string;
  client: string | null;
  year: string;
  description: string;
  image: string | null;
  imageAlt: string;
  aspectRatio: string;
  featured: boolean;
  archived?: boolean;
  sortOrder: number;
  gallery: string;
  published: boolean;
}): PortfolioItemDTO {
  return {
    id: item.id,
    title: item.title,
    category: item.category as PortfolioCategory,
    client: item.client,
    year: item.year,
    description: item.description,
    image: item.image,
    imageAlt: item.imageAlt,
    aspectRatio: item.aspectRatio as AspectRatio,
    featured: item.featured,
    archived: item.archived ?? false,
    sortOrder: item.sortOrder,
    gallery: parseJsonArray(item.gallery),
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
  startingPrice: string;
  turnaround?: string;
  image: string | null;
  imageAlt: string;
  bannerImage?: string | null;
  thumbnailImage?: string | null;
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
    startingPrice: item.startingPrice,
    turnaround: item.turnaround ?? "",
    image: item.image,
    imageAlt: item.imageAlt,
    bannerImage: item.bannerImage ?? null,
    thumbnailImage: item.thumbnailImage ?? null,
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
  featured: boolean;
  sortOrder: number;
  published: boolean;
}): TestimonialDTO {
  return {
    id: item.id,
    quote: item.quote,
    name: item.name,
    role: item.role,
    featured: item.featured,
    sortOrder: item.sortOrder,
    published: item.published,
  };
}

// Public getters
export async function getSiteConfig(): Promise<SiteConfig> {
  const stored = await getJsonContent(CONTENT_KEYS.siteConfig, DEFAULT_SITE_CONFIG);
  return { ...DEFAULT_SITE_CONFIG, ...stored };
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

export async function getPortfolioItems(publishedOnly = true): Promise<PortfolioItemDTO[]> {
  const items = await prisma.portfolioItem.findMany({
    where: publishedOnly ? { published: true, archived: false } : undefined,
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return items.map(mapPortfolioItem);
}

export async function getFeaturedPortfolio(): Promise<PortfolioItemDTO[]> {
  const items = await prisma.portfolioItem.findMany({
    where: { published: true, featured: true, archived: false },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 5,
  });
  return items.map(mapPortfolioItem);
}

export async function getPortfolioItemById(id: string): Promise<PortfolioItemDTO | null> {
  const item = await prisma.portfolioItem.findUnique({ where: { id } });
  return item ? mapPortfolioItem(item) : null;
}

export async function getServices(publishedOnly = true): Promise<ServiceDTO[]> {
  const items = await prisma.service.findMany({
    where: publishedOnly ? { published: true, archived: false } : undefined,
    orderBy: { sortOrder: "asc" },
  });
  return items.map(mapService);
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
  const items = await prisma.testimonial.findMany({
    where: publishedOnly ? { published: true } : undefined,
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
  });
  return items.map(mapTestimonial);
}

export async function getFeaturedTestimonials(): Promise<TestimonialDTO[]> {
  const items = await prisma.testimonial.findMany({
    where: { published: true, featured: true },
    orderBy: { sortOrder: "asc" },
  });
  return items.map(mapTestimonial);
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
};

export { mapPortfolioItem, mapService, mapTestimonial };
