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
 * Launch IA — fewer destinations, clearer jobs.
 * Scaffolds are not in primary nav. Insights redirects to Opportunities.
 */
export const ADMIN_NAV: AdminNavSection[] = [
  {
    label: "Today",
    items: [
      { label: "Home", href: "/admin", desc: "Mission · health · next actions" },
      { label: "Opportunities", href: "/admin/opportunities", desc: "What to do next · ranked by impact" },
      { label: "Risks", href: "/admin/risks", desc: "What needs attention" },
    ],
  },
  {
    label: "Work",
    items: [
      { label: "Pipeline", href: "/admin/pipeline", desc: "Deals · stages · follow-ups" },
      { label: "Inbox", href: "/admin/submissions", desc: "All inquiries" },
      { label: "Bookings", href: "/admin/submissions?type=booking", desc: "Booking inquiries" },
      { label: "Clients", href: "/admin/crm", desc: "People · history · AI notes" },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Sessions", href: "/admin/sessions-hub", desc: "Volumes · applications hub" },
      { label: "Applications", href: "/admin/applications", desc: "Applicant pipeline" },
      { label: "Volumes", href: "/admin/sessions", desc: "Edit session volumes" },
      { label: "Portfolio", href: "/admin/portfolio", desc: "Work archive" },
      { label: "Media", href: "/admin/media", desc: "Assets" },
    ],
  },
  {
    label: "Grow",
    items: [
      { label: "Marketing", href: "/admin/marketing", desc: "Campaigns · captions · plans" },
      { label: "Analytics", href: "/admin/analytics", desc: "Traffic · conversions" },
      { label: "Site", href: "/admin/homepage", desc: "Homepage · pages · SEO fields" },
      { label: "Reports", href: "/admin/reports", desc: "Business reports" },
    ],
  },
  {
    label: "Brain",
    items: [
      { label: "Ask ÉLEVÉ", href: "/admin/memory", desc: "Business Brain · memory · graph" },
      { label: "Mission Control", href: "/admin/intelligence", desc: "Deep briefing · directors" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Workflows", href: "/admin/automations", desc: "Automations (beta)" },
      { label: "Notifications", href: "/admin/notifications", desc: "Delivery & alerts" },
      { label: "Settings", href: "/admin/settings", desc: "Brand · SEO · contact" },
      { label: "Health", href: "/admin/qa", desc: "Connectors · readiness" },
    ],
  },
];

export const ADMIN_QUICK_ACTIONS = [
  { label: "Do next", href: "/admin/opportunities", desc: "Highest-impact action" },
  { label: "Open pipeline", href: "/admin/pipeline", desc: "Move deals forward" },
  { label: "Booking inbox", href: "/admin/submissions?type=booking", desc: "Respond to inquiries" },
  { label: "Review applications", href: "/admin/applications", desc: "Sessions applicants" },
  { label: "Draft campaign", href: "/admin/marketing?task=campaign", desc: "Marketing studio" },
  { label: "Ask ÉLEVÉ", href: "/admin/memory", desc: "Business Brain" },
];

/** Not in primary nav — command palette / deep links only. */
export const ADMIN_SECONDARY_NAV: AdminNavItem[] = [
  { label: "Services", href: "/admin/services", desc: "Offerings" },
  { label: "Testimonials", href: "/admin/testimonials", desc: "Social proof" },
  { label: "Page copy", href: "/admin/content", desc: "Global copy" },
  { label: "About page", href: "/admin/about", desc: "About content" },
  { label: "Contact page", href: "/admin/contact", desc: "Contact content" },
  { label: "Sponsorship", href: "/admin/sponsorship", desc: "Sponsor metrics" },
  { label: "Booking AI", href: "/admin/bookings-ai", desc: "Forecasts (estimated)" },
  { label: "Referrals (unavailable)", href: "/admin/referrals", desc: "Not shipping yet" },
  { label: "Email (unavailable)", href: "/admin/email", desc: "Not shipping yet" },
  { label: "Forms (unavailable)", href: "/admin/forms", desc: "Not shipping yet" },
  { label: "Content Hub (unavailable)", href: "/admin/content-hub", desc: "Not shipping yet" },
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
    section: "More",
    keywords: `${item.label} more ${item.desc ?? ""}`.toLowerCase(),
  })),
];
