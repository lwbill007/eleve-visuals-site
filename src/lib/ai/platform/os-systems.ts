/**
 * ÉLEVÉ OS — six systems. Every page owns one business question.
 * Nav + chrome should reference this registry; do not invent parallel IA.
 */

import type { AIPageContext } from "@/lib/ai/types";

export type OsSystemId = "command" | "work" | "create" | "grow" | "brain" | "trust";

export interface OsPageSpec {
  id: string;
  system: OsSystemId;
  label: string;
  href: string;
  /** One business question this page answers. */
  question: string;
  purpose: string;
  /** False keeps specialist workspaces searchable without crowding primary navigation. */
  primary?: boolean;
  aliases?: string[];
  aiContext?: AIPageContext;
  nestedAIContext?: AIPageContext;
  permission?: "admin";
}

export const OS_SYSTEM_LABELS: Record<OsSystemId, { label: string; mission: string }> = {
  command: { label: "Command", mission: "Know what’s happening. Decide what to do." },
  work: { label: "Work", mission: "Manage customers and projects." },
  create: { label: "Create", mission: "Produce exceptional work." },
  grow: { label: "Grow", mission: "Acquire more customers." },
  brain: { label: "Brain", mission: "Learn, predict, and remember." },
  trust: { label: "Trust", mission: "Ensure accuracy, security, and reliability." },
};

export const OS_PAGES: OsPageSpec[] = [
  // Command
  {
    id: "home",
    system: "command",
    label: "Home",
    href: "/admin",
    question: "What happened?",
    purpose: "Single source of truth for the CEO morning path.",
  },
  {
    id: "briefing",
    system: "command",
    label: "AI Briefing",
    href: "/admin/briefing",
    question: "Why did it happen?",
    purpose: "COO narrative — Measured Facts → Actions.",
  },
  {
    id: "opportunities",
    system: "command",
    label: "Opportunities",
    href: "/admin/opportunities",
    question: "How do we grow?",
    purpose: "Evidence-backed growth actions with outcome learning.",
    aliases: ["/admin/insights"],
  },
  {
    id: "risks",
    system: "command",
    label: "Risks",
    href: "/admin/risks",
    question: "What could hurt us?",
    purpose: "Prevent problems before they happen.",
  },
  {
    id: "leaks",
    system: "command",
    label: "Revenue Leaks",
    href: "/admin/leaks",
    question: "Where are we losing money?",
    purpose: "Full funnel Traffic → Paid with honest MissingMetric stages.",
  },
  // Work
  {
    id: "workboard",
    system: "work",
    label: "Workboard",
    href: "/admin/workboard",
    question: "What must I execute today?",
    purpose: "Daily operating system — tasks, deadlines, AI priority.",
  },
  {
    id: "pipeline",
    system: "work",
    label: "Pipeline",
    href: "/admin/pipeline",
    question: "Where is every deal?",
    purpose: "Visual CRM with win/ghost/value predictions.",
  },
  {
    id: "bookings",
    system: "work",
    label: "Bookings",
    href: "/admin/submissions?type=booking",
    question: "What does this booking need next?",
    purpose: "One booking record — timeline through files.",
    aliases: ["/admin/bookings"],
  },
  {
    id: "clients",
    system: "work",
    label: "Clients",
    href: "/admin/crm",
    question: "Who is this customer?",
    purpose: "Complete customer record — never search multiple pages.",
    nestedAIContext: "crm_profile",
  },
  {
    id: "inbox",
    system: "work",
    label: "Inbox",
    href: "/admin/submissions",
    question: "What needs a reply?",
    purpose: "One communication center across channels.",
  },
  // Create
  {
    id: "sessions",
    system: "create",
    label: "Sessions",
    href: "/admin/sessions-hub",
    question: "How do we produce the shoot?",
    purpose: "Planning through performance for every session.",
  },
  {
    id: "volumes",
    system: "create",
    label: "Volumes",
    href: "/admin/sessions",
    question: "How is this Volume performing?",
    purpose: "Signature campaigns with ROI and lessons learned.",
  },
  {
    id: "applications",
    system: "create",
    label: "Applications",
    href: "/admin/applications",
    question: "Who should we cast?",
    purpose: "Explainable AI scores — applications become leads.",
  },
  {
    id: "portfolio",
    system: "create",
    label: "Portfolio",
    href: "/admin/portfolio",
    question: "Which work drives business?",
    purpose: "Views → inquiries → revenue attribution per project.",
  },
  {
    id: "media",
    system: "create",
    label: "Media",
    href: "/admin/media",
    question: "Where is the asset?",
    purpose: "Professional DAM — search, versions, Cloudinary.",
  },
  // Grow
  {
    id: "marketing",
    system: "grow",
    label: "Marketing",
    href: "/admin/marketing",
    question: "What campaigns should run?",
    purpose: "One campaign center across channels.",
  },
  {
    id: "email",
    system: "grow",
    label: "Email",
    href: "/admin/email",
    question: "What should we send?",
    purpose: "Campaigns, sequences, and AI-written follow-ups.",
  },
  {
    id: "analytics",
    system: "grow",
    label: "Analytics",
    href: "/admin/analytics",
    question: "What is traffic doing?",
    purpose: "Single analytics SSoT — no duplicate charts elsewhere.",
  },
  {
    id: "website",
    system: "grow",
    label: "Website Intelligence",
    href: "/admin/website",
    question: "Is the site healthy?",
    purpose: "Perf, a11y, SEO, forms, errors — evidence only.",
  },
  {
    id: "homepage",
    system: "grow",
    label: "Homepage Intelligence",
    href: "/admin/homepage",
    question: "Is the homepage converting?",
    purpose: "Hero/CTA/scroll/conversions with version history.",
  },
  {
    id: "reports",
    system: "grow",
    label: "Reports",
    href: "/admin/reports",
    question: "What should leadership see?",
    purpose: "Automatic period reports with one-click export.",
  },
  // Brain
  {
    id: "memory",
    system: "brain",
    label: "Business Brain",
    href: "/admin/memory",
    question: "What have we learned?",
    purpose: "Rules, decisions, patterns, confidence, learning.",
    aliases: ["/admin/intelligence", "/admin/assistant"],
  },
  {
    id: "research",
    system: "brain",
    label: "Web Research",
    href: "/admin/research",
    question: "What does external research say?",
    purpose: "Gated research — never treat the web as truth.",
  },
  {
    id: "timeline",
    system: "brain",
    label: "Timeline",
    href: "/admin/timeline",
    question: "What happened across the business?",
    purpose: "Every business event — searchable forever.",
  },
  {
    id: "booking-intelligence",
    system: "brain",
    label: "Booking Intelligence",
    href: "/admin/bookings-ai",
    question: "Will this booking close?",
    purpose: "Sales predictions that learn after every booking.",
  },
  // Trust
  {
    id: "qa",
    system: "trust",
    label: "Executive QA",
    href: "/admin/qa",
    question: "What is broken or incomplete?",
    purpose: "Automated audits with evidence, fix, verification.",
  },
  {
    id: "financial",
    system: "trust",
    label: "Financial Center",
    href: "/admin/financial",
    question: "Where is the money?",
    purpose: "Owns Revenue — invoices, cash, forecasts, balances.",
  },
  {
    id: "automations",
    system: "trust",
    label: "Automation Center",
    href: "/admin/automations",
    question: "What is running automatically?",
    purpose: "Status, failures, cost, dependencies for every job.",
  },
  {
    id: "ai-operations",
    system: "trust",
    label: "AI Operations",
    href: "/admin/ai-operations",
    question: "Is the AI trustworthy?",
    purpose: "Routing, cost, accuracy, learning — not just uptime.",
  },
  {
    id: "notifications",
    system: "trust",
    label: "Notifications",
    href: "/admin/notifications",
    question: "What needs attention now?",
    purpose: "Only actionable alerts, grouped by severity.",
  },
  {
    id: "settings",
    system: "trust",
    label: "Settings",
    href: "/admin/settings",
    question: "How is the OS configured?",
    purpose: "Clear domains — org, brand, AI, security, billing.",
  },
  {
    id: "services",
    system: "create",
    label: "Services",
    href: "/admin/services",
    question: "What can clients book?",
    purpose: "Offerings CMS.",
    primary: false,
  },
  {
    id: "testimonials",
    system: "create",
    label: "Testimonials",
    href: "/admin/testimonials",
    question: "Which proof should the site show?",
    purpose: "Social proof CMS.",
    primary: false,
  },
  {
    id: "content",
    system: "create",
    label: "Page Copy",
    href: "/admin/content",
    question: "What shared copy is published?",
    purpose: "Global copy and FAQ.",
    primary: false,
  },
  {
    id: "about",
    system: "create",
    label: "About",
    href: "/admin/about",
    question: "How does the brand introduce itself?",
    purpose: "About page CMS.",
    primary: false,
  },
  {
    id: "contact",
    system: "create",
    label: "Contact",
    href: "/admin/contact",
    question: "How can clients make contact?",
    purpose: "Contact page CMS.",
    primary: false,
  },
  {
    id: "booking-form",
    system: "create",
    label: "Booking form",
    href: "/admin/booking",
    question: "What does booking intake ask?",
    purpose: "Canonical booking form CMS.",
    primary: false,
  },
  {
    id: "forms",
    system: "work",
    label: "Forms hub",
    href: "/admin/forms",
    question: "Which intake forms are active?",
    purpose: "All intake forms.",
    primary: false,
  },
  {
    id: "sponsorship",
    system: "grow",
    label: "Sponsorship",
    href: "/admin/sponsorship",
    question: "What sponsorship activity is measured?",
    purpose: "Sponsor metrics.",
    primary: false,
    aiContext: "sponsorship",
  },
  {
    id: "referrals",
    system: "grow",
    label: "Lead sources",
    href: "/admin/referrals",
    question: "Which measured sources refer clients?",
    purpose: "Self-reported source attribution · CRM.",
    primary: false,
  },
  {
    id: "content-hub",
    system: "grow",
    label: "Content studio",
    href: "/admin/content-hub",
    question: "Which content drafts need review?",
    purpose: "AI-assisted content drafts.",
    primary: false,
  },
  {
    id: "payments-legacy",
    system: "trust",
    label: "Payments (legacy)",
    href: "/admin/payments",
    question: "Where is settled payment truth?",
    purpose: "Redirects to Financial Center.",
    primary: false,
  },
  {
    id: "ai-health-legacy",
    system: "trust",
    label: "AI Health (legacy)",
    href: "/admin/ai-health",
    question: "Is the AI trustworthy?",
    purpose: "Redirects to AI Operations.",
    primary: false,
  },
];

const AI_CONTEXT_BY_PAGE: Partial<Record<string, AIPageContext>> = {
  home: "dashboard",
  briefing: "assistant",
  opportunities: "opportunities",
  risks: "risks",
  leaks: "intelligence",
  workboard: "pipeline",
  pipeline: "pipeline",
  bookings: "bookings",
  clients: "crm",
  inbox: "general",
  sessions: "sessions",
  volumes: "sessions",
  applications: "applications",
  portfolio: "portfolio",
  media: "portfolio",
  marketing: "marketing",
  email: "email",
  analytics: "analytics",
  website: "analytics",
  homepage: "analytics",
  reports: "reports",
  memory: "memory",
  research: "insights",
  timeline: "intelligence",
  "booking-intelligence": "bookings",
  qa: "general",
  financial: "intelligence",
  automations: "automations",
  "ai-operations": "intelligence",
  notifications: "general",
  settings: "general",
};

export function matchesOsPage(
  page: OsPageSpec,
  pathname: string,
  search: string
): boolean {
  const candidates = [page.href, ...(page.aliases ?? [])];
  return candidates.some((candidate) => {
    const [pathPart, queryPart] = candidate.split("?");
    const pathMatch =
      pathPart === "/admin"
        ? pathname === "/admin"
        : pathname === pathPart || pathname.startsWith(`${pathPart}/`);
    if (!pathMatch) return false;
    if (!queryPart) return true;
    const required = new URLSearchParams(queryPart);
    const current = new URLSearchParams(search);
    return Array.from(required.entries()).every(([key, value]) => current.get(key) === value);
  });
}

export function resolveOsPage(pathname: string, search = ""): OsPageSpec | undefined {
  const matches = OS_PAGES.filter((page) => matchesOsPage(page, pathname, search));
  return matches.toSorted((a, b) => {
    const aQuery = a.href.includes("?") ? 1 : 0;
    const bQuery = b.href.includes("?") ? 1 : 0;
    if (aQuery !== bQuery) return bQuery - aQuery;
    return b.href.split("?")[0].length - a.href.split("?")[0].length;
  })[0];
}

export function osAIContext(
  page: OsPageSpec | undefined,
  pathname?: string
): AIPageContext {
  if (!page) return "general";
  const basePath = page.href.split("?")[0];
  if (
    page.nestedAIContext &&
    pathname &&
    pathname !== basePath &&
    pathname.startsWith(`${basePath}/`)
  ) {
    return page.nestedAIContext;
  }
  return page.aiContext ?? AI_CONTEXT_BY_PAGE[page.id] ?? "general";
}

export function osPage(id: string): OsPageSpec | undefined {
  return OS_PAGES.find((p) => p.id === id);
}

export function osEyebrow(system: OsSystemId, question: string): string {
  return `${OS_SYSTEM_LABELS[system].label} · ${question}`;
}
