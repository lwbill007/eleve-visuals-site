export type PortfolioCategory =
  | "Portraits"
  | "Brands"
  | "Athletes"
  | "Events"
  | "Video"
  | "BTS"
  | "Creative Direction";

export const PORTFOLIO_CATEGORIES: PortfolioCategory[] = [
  "Portraits",
  "Brands",
  "Athletes",
  "Events",
  "Video",
  "BTS",
  "Creative Direction",
];

export type AspectRatio = "portrait" | "landscape" | "square" | "wide";

export interface SiteConfig {
  name: string;
  creator: string;
  tagline: string;
  description: string;
  url: string;
  email: string;
  instagram: string;
  instagramUrl: string;
  location: string;
  serviceArea: string;
  responseTime: string;
}

export interface HeroContent {
  headline: string;
  subheadline: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  image: string | null;
  imageAlt: string;
}

export interface BrandStory {
  eyebrow: string;
  headline: string;
  body: string[];
  stats: { value: string; label: string }[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface AboutContent {
  headline: string;
  intro: string;
  story: string[];
  philosophy: {
    headline: string;
    pillars: { title: string; description: string }[];
  };
  process: {
    headline: string;
    steps: { step: string; title: string; description: string }[];
  };
  trust: {
    headline: string;
    points: string[];
  };
  image: string | null;
  imageAlt: string;
}

export interface ContactPageContent {
  headline: string;
  subheadline: string;
  formNote: string;
  bookingLink: string;
  calendarUrl: string | null;
}

export interface SessionsContent {
  title: string;
  tagline: string;
  theme: string;
  themeDescription: string;
  heroImage: string | null;
  heroImageAlt: string;
  description: string[];
  mood: {
    headline: string;
    keywords: string[];
    description: string;
  };
  expectations: {
    headline: string;
    items: string[];
  };
  dressCode: {
    headline: string;
    description: string;
  };
  eventDetails: {
    date: string;
    time: string;
    location: string;
    capacity: string;
    applicationDeadline: string;
  };
  faq: FaqItem[];
  applyCta: { label: string; href: string };
}

export interface SessionsApplicationContent {
  headline: string;
  subheadline: string;
  successTitle: string;
  successMessage: string;
  nextSteps: string[];
  minAge: number;
}

export interface ServicesPageIntro {
  headline: string;
  subheadline: string;
}

export interface ServiceEditorialSection {
  slug: string;
  eyebrow: string;
  headline: string;
  description: string;
  capabilities: string[];
  ctaLabel: string;
  ctaHref: string;
}

export interface ServicesProcessStep {
  step: string;
  title: string;
  description: string;
}

export interface ServicesPillar {
  title: string;
  description: string;
}

export interface ServicesClientStep {
  title: string;
  description: string;
}

export interface ServicesPageContent {
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    image: string | null;
    imageAlt: string;
    videoUrl: string | null;
  };
  sections: ServiceEditorialSection[];
  process: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    steps: ServicesProcessStep[];
  };
  whyEleve: {
    eyebrow: string;
    headline: string;
    items: ServicesPillar[];
  };
  clientExperience: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    steps: ServicesClientStep[];
  };
  featuredWork: {
    eyebrow: string;
    headline: string;
    subheadline: string;
  };
  faq: {
    eyebrow: string;
    headline: string;
    items: FaqItem[];
  };
  finalCta: {
    headline: string;
    subheadline: string;
    primaryLabel: string;
    primaryHref: string;
  };
}

export interface BookingOptions {
  serviceTypes: string[];
  shootTypes: string[];
  budgetRanges: string[];
  deliverables: string[];
}

export interface PortfolioItemDTO {
  id: string;
  title: string;
  category: PortfolioCategory;
  client?: string | null;
  year: string;
  description: string;
  image: string | null;
  imageAlt: string;
  aspectRatio: AspectRatio;
  featured: boolean;
  sortOrder: number;
  gallery: string[];
  published: boolean;
}

export interface ServiceDTO {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  forWhom: string;
  includes: string[];
  startingPrice: string;
  image: string | null;
  imageAlt: string;
  sortOrder: number;
  published: boolean;
}

export interface TestimonialDTO {
  id: string;
  quote: string;
  name: string;
  role: string;
  featured: boolean;
  sortOrder: number;
  published: boolean;
}

export interface HomeServiceCard {
  title: string;
  description: string;
  href: string;
}

export interface PageCta {
  headline: string;
  subheadline?: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export interface PageCopy {
  homeCta: PageCta;
  portfolioHero: { headline: string; subheadline: string };
  portfolioCta: PageCta;
  servicesCta: PageCta;
  aboutCta: PageCta;
  sessionsCta: PageCta;
  bookPage: {
    headline: string;
    subheadline: string;
    notes: string[];
    successTitle: string;
    successMessage: string;
    nextSteps: string[];
  };
}

export interface BookingTermsContent {
  headline: string;
  intro: string;
  sections: { title: string; body: string }[];
}

export const SESSIONS_APPLICANT_ROLES = [
  "Model",
  "Photographer",
  "Videographer",
  "Stylist",
  "Makeup Artist",
  "Creative Assistant",
  "Other",
] as const;

export const EXPERIENCE_LEVELS = [
  "Emerging (0–2 years)",
  "Developing (2–5 years)",
  "Established (5+ years)",
  "Professional / Agency Level",
] as const;

export const NAVIGATION = [
  { label: "Work", href: "/portfolio" },
  { label: "Services", href: "/services" },
  { label: "Sessions", href: "/sessions" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const SESSION_VOLUME_STATUSES = [
  "draft",
  "coming_soon",
  "applications_open",
  "applications_closed",
  "sold_out",
  "archived",
] as const;

export type SessionVolumeStatus = (typeof SESSION_VOLUME_STATUSES)[number];

export interface SessionTimelineStep {
  label: string;
  detail?: string;
}

export interface SessionVolumeDTO {
  id: string;
  volumeNumber: number;
  title: string;
  slug: string;
  theme: string;
  subtitle: string;
  synopsis: string;
  posterImage: string | null;
  posterImageAlt: string;
  bannerImage: string | null;
  bannerImageAlt: string;
  moodBoard: string[];
  gallery: string[];
  status: SessionVolumeStatus;
  genre: string;
  year: string;
  sessionDate: string;
  sessionTime: string;
  location: string;
  city: string;
  capacity: string;
  category: string;
  creativeDirector: string;
  dressCode: string;
  runtime: string;
  requirements: string[];
  timeline: SessionTimelineStep[];
  applicationDeadline: string | null;
  teaserVideoUrl: string | null;
  featured: boolean;
  published: boolean;
  showApplyButton: boolean;
  seoTitle: string;
  seoDescription: string;
  sortOrder: number;
}
