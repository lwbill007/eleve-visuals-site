export type AdminNavItem = {
  label: string;
  href: string;
  desc?: string;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

/**
 * Launch-complete IA — every primary item is a live workspace (no scaffolds).
 * Secondary items are also live CMS / tools reachable via ⌘K.
 */
export const ADMIN_NAV: AdminNavSection[] = [
  {
    label: "Command",
    items: [
      { label: "Home", href: "/admin", desc: "Command Center · health · execute" },
      { label: "AI Briefing", href: "/admin/briefing", desc: "CEO morning brief · refresh" },
      { label: "Opportunities", href: "/admin/opportunities", desc: "Ranked queue · execute" },
      { label: "Risks", href: "/admin/risks", desc: "Attention · blockers" },
      { label: "Revenue Leaks", href: "/admin/leaks", desc: "Lost money · recovery" },
    ],
  },
  {
    label: "Work",
    items: [
      { label: "Workboard", href: "/admin/workboard", desc: "Inbox + stale deals" },
      { label: "Pipeline", href: "/admin/pipeline", desc: "Deals · stages" },
      { label: "Bookings", href: "/admin/submissions?type=booking", desc: "Mission control · inquiries" },
      { label: "Clients", href: "/admin/crm", desc: "People · timeline · AI" },
      { label: "Inbox", href: "/admin/submissions", desc: "All submissions" },
    ],
  },
  {
    label: "Make",
    items: [
      { label: "Sessions", href: "/admin/sessions-hub", desc: "Volumes hub" },
      { label: "Volumes", href: "/admin/sessions", desc: "Edit volumes" },
      { label: "Applications", href: "/admin/applications", desc: "Accept · email" },
      { label: "Portfolio", href: "/admin/portfolio", desc: "Work archive" },
      { label: "Media", href: "/admin/media", desc: "Assets" },
    ],
  },
  {
    label: "Grow",
    items: [
      { label: "Marketing", href: "/admin/marketing", desc: "Campaigns · captions" },
      { label: "Email", href: "/admin/email", desc: "Send follow-ups" },
      { label: "Analytics", href: "/admin/analytics", desc: "Traffic · conversion" },
      { label: "Website", href: "/admin/website", desc: "SEO · UX · conversion intel" },
      { label: "Homepage", href: "/admin/homepage", desc: "Public homepage CMS" },
      { label: "Reports", href: "/admin/reports", desc: "AI business reports" },
    ],
  },
  {
    label: "Brain",
    items: [
      { label: "Business Brain", href: "/admin/memory", desc: "Know · graph · simulate" },
      { label: "Web Research", href: "/admin/research", desc: "Gated external intel" },
      { label: "Timeline", href: "/admin/timeline", desc: "Business events" },
      { label: "Booking AI", href: "/admin/bookings-ai", desc: "Forecasts (estimated)" },
    ],
  },
  {
    label: "Trust",
    items: [
      { label: "Executive QA", href: "/admin/qa", desc: "Missing intel · readiness" },
      { label: "Payments", href: "/admin/payments", desc: "Settled cash" },
      { label: "Automations", href: "/admin/automations", desc: "System jobs" },
      { label: "AI Health", href: "/admin/ai-health", desc: "Models · reliability · retries" },
      { label: "Notifications", href: "/admin/notifications", desc: "Delivery log" },
      { label: "Settings", href: "/admin/settings", desc: "Brand · access" },
    ],
  },
];

export const ADMIN_QUICK_ACTIONS = [
  { label: "AI Briefing", href: "/admin/briefing", desc: "Morning brief" },
  { label: "Execute next", href: "/admin/opportunities", desc: "Highest-impact action" },
  { label: "Workboard", href: "/admin/workboard", desc: "Inbox + stale" },
  { label: "Clients", href: "/admin/crm", desc: "People" },
  { label: "Send email", href: "/admin/email", desc: "Follow-up" },
  { label: "Business Brain", href: "/admin/memory", desc: "Knowledge" },
];

/** Live secondary workspaces — command palette + Website section. */
export const ADMIN_SECONDARY_NAV: AdminNavItem[] = [
  { label: "Services", href: "/admin/services", desc: "Offerings CMS" },
  { label: "Testimonials", href: "/admin/testimonials", desc: "Social proof CMS" },
  { label: "Page Copy", href: "/admin/content", desc: "Global copy · FAQ" },
  { label: "About", href: "/admin/about", desc: "About page CMS" },
  { label: "Contact", href: "/admin/contact", desc: "Contact page CMS" },
  { label: "Booking form", href: "/admin/booking", desc: "Booking form CMS" },
  { label: "Forms hub", href: "/admin/forms", desc: "All intake forms" },
  { label: "Sponsorship", href: "/admin/sponsorship", desc: "Sponsor metrics" },
  { label: "Referrals hub", href: "/admin/referrals", desc: "Referral sources · CRM" },
  { label: "Content studio", href: "/admin/content-hub", desc: "AI content drafts" },
];

export const ADMIN_COMMANDS = [
  ...ADMIN_NAV.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      section: section.label,
      keywords: `${item.label} ${section.label} ${item.desc ?? ""}`.toLowerCase(),
    }))
  ),
  ...ADMIN_SECONDARY_NAV.map((item) => ({
    ...item,
    section: "Website & more",
    keywords: `${item.label} more ${item.desc ?? ""}`.toLowerCase(),
  })),
];
