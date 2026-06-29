export type PortfolioCategory = string;

export const PORTFOLIO_CATEGORIES: string[] = [
  "Portraits",
  "Brands",
  "Athletes",
  "Events",
  "Creative Direction",
  "Video",
  "BTS",
  "Editorial",
  "Lifestyle",
];

export type AspectRatio = "portrait" | "landscape" | "square" | "wide";

export interface BrandColors {
  ink: string;
  charcoal: string;
  stone: string;
  muted: string;
  fog: string;
  cream: string;
  creamDim: string;
  accent: string;
  accentDim: string;
}

export interface SiteConfig {
  name: string;
  creator: string;
  tagline: string;
  description: string;
  url: string;
  email: string;
  phone: string;
  instagram: string;
  instagramUrl: string;
  tiktok: string;
  tiktokUrl: string;
  location: string;
  serviceArea: string;
  responseTime: string;
  businessHours: string;
  logo: string | null;
  favicon: string | null;
  seoTitle: string;
  seoDescription: string;
  copyrightText: string;
  ogImage: string | null;
  googleAnalyticsId: string;
  brandColors: BrandColors;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface NavigationConfig {
  navLinks: NavLink[];
  footerLinks: NavLink[];
  footerText: string;
}

export interface HomepageSection {
  id: string;
  label: string;
  enabled: boolean;
}

export interface HomepageBanner {
  enabled: boolean;
  text: string;
  href: string;
  image: string | null;
}

export interface HomepageStat {
  label: string;
  value: string;
  enabled: boolean;
}

export interface HomepageSectionCopy {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
}

export interface HomepageProcessStep {
  step: string;
  title: string;
  description: string;
}

export interface HomepageWhyPillar {
  title: string;
  description: string;
}

export interface HomepageCtaCopy extends HomepageSectionCopy {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  backgroundImage: string | null;
  videoUrl: string | null;
}

export interface HomepageContent {
  sections: HomepageSection[];
  featuredSessionVolumeId: string | null;
  banner: HomepageBanner | null;
  stats: {
    enabled: boolean;
    items: HomepageStat[];
  };
  workFilters: string[];
  copy: {
    featuredWork: HomepageSectionCopy;
    services: HomepageSectionCopy;
    sessions: HomepageSectionCopy;
    whyEleve: HomepageSectionCopy;
    process: HomepageSectionCopy;
    testimonials: HomepageSectionCopy;
    cta: HomepageCtaCopy;
  };
  processSteps: HomepageProcessStep[];
  whyPillars: HomepageWhyPillar[];
}

export interface HeroContent {
  headline: string;
  subheadline: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  image: string | null;
  imageAlt: string;
  videoUrl: string | null;
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

export type NotificationChannel = "email" | "sms" | "push" | "webhook";

export type NotificationFormType = "contact" | "booking" | "session" | "test";

export type WebhookType = "generic" | "discord" | "slack";

export type DigestFrequency = "off" | "daily" | "weekly";

export interface WebhookConfig {
  url: string;
  type: WebhookType;
  enabled: boolean;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  pushSound: boolean;
  webhookEnabled: boolean;
  notificationEmails: string[];
  smsPhone: string;
  webhooks: WebhookConfig[];
  sendApplicantConfirmation: boolean;
  digestFrequency: DigestFrequency;
  digestEmails: string[];
  /** @deprecated use notificationEmails — kept for backward compatibility */
  notificationEmail?: string;
}

export interface NotificationLogDTO {
  id: string;
  submissionId: string | null;
  formType: string;
  channel: NotificationChannel;
  provider: string;
  recipient: string;
  subject: string;
  preview: string;
  status: "sent" | "failed" | "pending" | "skipped";
  error: string;
  attempts: number;
  read: boolean;
  archived: boolean;
  createdAt: string;
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
  sessionSettings: string[];
  durations: string[];
  budgetRanges: string[];
  deliverables: string[];
  referralSources: string[];
}

export const INQUIRY_STATUSES = ["new", "contacted", "scheduled", "completed", "archived"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  scheduled: "Scheduled / Confirmed",
  completed: "Completed",
  archived: "Archived",
};

export const INQUIRY_STATUS_COLORS: Record<InquiryStatus, string> = {
  new: "text-amber-400 border-amber-400/40",
  contacted: "text-sky-400 border-sky-400/40",
  scheduled: "text-emerald-400 border-emerald-400/40",
  completed: "text-fog border-stone/40",
  archived: "text-muted border-stone/30",
};

export const APPLICATION_STATUSES = [
  "pending_review",
  "shortlisted",
  "interview",
  "accepted",
  "waitlisted",
  "declined",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending_review: "Pending Review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  pending_review: "text-amber-400 border-amber-400/40",
  shortlisted: "text-sky-400 border-sky-400/40",
  interview: "text-cyan-400 border-cyan-400/40",
  accepted: "text-emerald-400 border-emerald-400/40",
  waitlisted: "text-violet-400 border-violet-400/40",
  declined: "text-red-400 border-red-400/40",
  withdrawn: "text-muted border-stone/30",
};

/** Map legacy statuses stored before the workflow upgrade. */
export const LEGACY_APPLICATION_STATUS_MAP: Record<string, ApplicationStatus> = {
  new: "pending_review",
  contacted: "shortlisted",
  accepted: "accepted",
  rejected: "declined",
  waitlisted: "waitlisted",
  confirmed: "accepted",
};

export function normalizeApplicationStatus(status: string): ApplicationStatus {
  if ((APPLICATION_STATUSES as readonly string[]).includes(status)) {
    return status as ApplicationStatus;
  }
  return LEGACY_APPLICATION_STATUS_MAP[status] ?? "pending_review";
}

export interface PortfolioCredit {
  role: string;
  name: string;
}

export interface PortfolioItemDTO {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: PortfolioCategory;
  client?: string | null;
  year: string;
  description: string;
  creativeProcess: string;
  image: string | null;
  imageAlt: string;
  heroImage: string | null;
  heroImageAlt: string;
  aspectRatio: AspectRatio;
  featured: boolean;
  portfolioFeatured: boolean;
  archived: boolean;
  sortOrder: number;
  gallery: string[];
  btsGallery: string[];
  videos: string[];
  deliverables: string[];
  credits: PortfolioCredit[];
  relatedServices: string[];
  seoTitle: string;
  seoDescription: string;
  published: boolean;
}

export interface PortfolioStat {
  label: string;
  value: string;
}

export interface PortfolioPageContent {
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    description: string;
    image: string | null;
    imageAlt: string;
    videoUrl: string | null;
  };
  stats: PortfolioStat[];
  categories: string[];
  emptyState: {
    headline: string;
    subheadline: string;
    ctaLabel: string;
    ctaHref: string;
  };
}

export interface ServiceDTO {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  forWhom: string;
  includes: string[];
  deliverables: string[];
  faqs: string[];
  startingPrice: string;
  turnaround: string;
  image: string | null;
  imageAlt: string;
  bannerImage: string | null;
  thumbnailImage: string | null;
  featured: boolean;
  sortOrder: number;
  published: boolean;
  archived: boolean;
}

export interface TestimonialDTO {
  id: string;
  quote: string;
  name: string;
  role: string;
  image: string | null;
  imageAlt: string;
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

export const SESSION_APPLICATION_ROLES = [
  "Photographer",
  "Model",
  "Videographer",
  "Creative Director",
  "Stylist",
  "Makeup Artist",
  "Hair Artist",
  "Designer",
  "Content Creator",
  "Other",
] as const;

export const SESSIONS_APPLICANT_ROLES = SESSION_APPLICATION_ROLES;

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
  "completed",
  "archived",
] as const;

export type SessionVolumeStatus = (typeof SESSION_VOLUME_STATUSES)[number];

export interface SessionTimelineStep {
  label: string;
  detail?: string;
}

export interface VolumeSponsor {
  name: string;
  logo: string;
  url: string;
}

export interface VolumeResource {
  label: string;
  url: string;
}

export interface VolumeFAQ {
  question: string;
  answer: string;
}

export interface VolumeTestimonial {
  quote: string;
  name: string;
  role: string;
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
  btsGallery: string[];
  videos: string[];
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
  directorsNote: string;
  galleryDelivery: string;
  dressCode: string;
  runtime: string;
  requirements: string[];
  timeline: SessionTimelineStep[];
  applicationDeadline: string | null;
  teaserVideoUrl: string | null;
  playlistUrl: string | null;
  interviews: string[];
  audio: string[];
  productionNotes: string;
  callSheet: string | null;
  creativeBrief: string;
  wardrobeGuide: string | null;
  sponsors: VolumeSponsor[];
  resources: VolumeResource[];
  faqs: VolumeFAQ[];
  mood: string;
  season: string;
  difficulty: string;
  colorPalette: string[];
  inspirations: string[];
  testimonials: VolumeTestimonial[];
  featured: boolean;
  published: boolean;
  showApplyButton: boolean;
  seoTitle: string;
  seoDescription: string;
  sortOrder: number;
  applicationSettings: SessionApplicationSettings;
}

export const CAST_ROLES = [
  "director",
  "creative_director",
  "photographer",
  "videographer",
  "model",
  "stylist",
  "makeup_artist",
  "hair_stylist",
  "designer",
  "assistant",
  "other",
] as const;

export type CastRole = (typeof CAST_ROLES)[number];

export const CAST_STATUSES = ["confirmed", "pending", "alumni"] as const;
export type CastStatus = (typeof CAST_STATUSES)[number];

export interface CastAward {
  name: string;
  year: string;
  category: string;
  icon: string;
  reason: string;
  volume: string;
}

export interface CastMemberDTO {
  id: string;
  volumeId: string;
  fullName: string;
  stageName: string;
  slug: string;
  role: CastRole;
  profilePhoto: string | null;
  additionalPhotos: string[];
  bio: string;
  instagram: string;
  tiktok: string;
  website: string;
  portfolioLink: string;
  city: string;
  status: CastStatus;
  featured: boolean;
  isAlumni: boolean;
  featuredAlumni: boolean;
  notes: string;
  futureCollaborations: string;
  enableProfile: boolean;
  awards: CastAward[];
  sortOrder: number;
}

/** A Volume a person has appeared in — used for cross-Volume linking on profiles. */
export interface CastAppearance {
  volumeNumber: number;
  title: string;
  slug: string;
  role: CastRole;
}

export interface SessionApplicationQuestion {
  id: string;
  label: string;
  placeholder?: string;
  maxLength: number;
  required: boolean;
}

export interface SessionApplicationEmailTemplates {
  submissionConfirmation: string;
  acceptance: string;
  waitlist: string;
  rejection: string;
  followUp: string;
}

export interface SessionApplicationSettings {
  maxCapacity: number | null;
  waitlistEnabled: boolean;
  autoCloseOnDeadline: boolean;
  autoCloseOnCapacity: boolean;
  requirePortfolioUpload: boolean;
  requireRoleSelection: boolean;
  customConfirmationMessage: string;
  questions: SessionApplicationQuestion[];
  emailTemplates: SessionApplicationEmailTemplates;
  notifyAdminOnSubmission: boolean;
  notifyApplicantOnSubmission: boolean;
}

export interface SessionApplicationData {
  fullName: string;
  email: string;
  phone: string;
  cityState: string;
  instagram: string;
  portfolioWebsite?: string;
  roles: string[];
  experience?: string;
  portfolioImages: string[];
  portfolioLink?: string;
  demoReel?: string;
  youtube?: string;
  vimeo?: string;
  behance?: string;
  driveLink?: string;
  questionAnswers: { id: string; question: string; answer: string }[];
  availabilityConfirm: boolean;
  transportationConfirm: boolean;
  creativeDirectionConfirm: boolean;
  emergencyContact?: string;
  agreementCurated: boolean;
  agreementNoGuarantee: boolean;
  agreementGuidelines: boolean;
  agreementAccurate: boolean;
  sessionVolumeId?: string;
  sessionVolumeSlug?: string;
  sessionVolumeTitle?: string;
}
