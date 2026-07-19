/**
 * ÉLEVÉ OS — six systems. Every page owns one business question.
 * Nav + chrome should reference this registry; do not invent parallel IA.
 */

export type OsSystemId = "command" | "work" | "create" | "grow" | "brain" | "trust";

export interface OsPageSpec {
  id: string;
  system: OsSystemId;
  label: string;
  href: string;
  /** One business question this page answers. */
  question: string;
  purpose: string;
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
  },
  {
    id: "clients",
    system: "work",
    label: "Clients",
    href: "/admin/crm",
    question: "Who is this customer?",
    purpose: "Complete customer record — never search multiple pages.",
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
];

export function osPage(id: string): OsPageSpec | undefined {
  return OS_PAGES.find((p) => p.id === id);
}

export function osEyebrow(system: OsSystemId, question: string): string {
  return `${OS_SYSTEM_LABELS[system].label} · ${question}`;
}
