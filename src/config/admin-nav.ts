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
 * OS IA — decision-first workspaces (CPO audit).
 * Command · Work · Make · Grow · Brain · Trust
 * Theater (draft-only workflows, unavailable modules) stays out of primary nav.
 */
export const ADMIN_NAV: AdminNavSection[] = [
  {
    label: "Command",
    items: [
      { label: "Command Center", href: "/admin", desc: "Brief · health · execute next" },
      { label: "Opportunities", href: "/admin/opportunities", desc: "Ranked queue · one-click execute" },
      { label: "Risks", href: "/admin/risks", desc: "Leaks · attention · blockers" },
    ],
  },
  {
    label: "Work",
    items: [
      { label: "Pipeline", href: "/admin/pipeline", desc: "Deals · stages · follow-ups" },
      { label: "Inbox", href: "/admin/submissions", desc: "All inquiries" },
      { label: "Bookings", href: "/admin/submissions?type=booking", desc: "Booking inquiries" },
      { label: "People", href: "/admin/crm", desc: "Clients · history · AI notes" },
    ],
  },
  {
    label: "Make",
    items: [
      { label: "Sessions", href: "/admin/sessions-hub", desc: "Volumes · applications hub" },
      { label: "Applications", href: "/admin/applications", desc: "Accept · email · decide" },
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
      { label: "Website", href: "/admin/homepage", desc: "Homepage · pages · SEO" },
    ],
  },
  {
    label: "Brain",
    items: [
      { label: "Business Brain", href: "/admin/memory", desc: "Know · decide · simulate" },
    ],
  },
  {
    label: "Trust",
    items: [
      { label: "Missing Intel", href: "/admin/qa", desc: "Connectors · confidence · readiness" },
      { label: "Automations", href: "/admin/automations", desc: "Runnable system jobs" },
      { label: "Notifications", href: "/admin/notifications", desc: "Delivery & alerts" },
      { label: "Settings", href: "/admin/settings", desc: "Brand · SEO · contact" },
    ],
  },
];

export const ADMIN_QUICK_ACTIONS = [
  { label: "Execute next", href: "/admin/opportunities", desc: "Highest-impact action" },
  { label: "Open pipeline", href: "/admin/pipeline", desc: "Move deals forward" },
  { label: "Booking inbox", href: "/admin/submissions?type=booking", desc: "Respond to inquiries" },
  { label: "Review applications", href: "/admin/applications", desc: "Sessions applicants" },
  { label: "Missing intel", href: "/admin/qa", desc: "Fix confidence gaps" },
  { label: "Business Brain", href: "/admin/memory", desc: "Knowledge · graph" },
];

/** Not in primary nav — command palette / deep links only. */
export const ADMIN_SECONDARY_NAV: AdminNavItem[] = [
  { label: "Services", href: "/admin/services", desc: "Offerings" },
  { label: "Testimonials", href: "/admin/testimonials", desc: "Social proof" },
  { label: "Page copy", href: "/admin/content", desc: "Global copy" },
  { label: "About page", href: "/admin/about", desc: "About content" },
  { label: "Contact page", href: "/admin/contact", desc: "Contact content" },
  { label: "Sponsorship", href: "/admin/sponsorship", desc: "Sponsor metrics" },
  { label: "Booking forecasts", href: "/admin/bookings-ai", desc: "Estimated forecasts" },
  { label: "Reports (draft)", href: "/admin/reports", desc: "AI narrative — not BI" },
  { label: "Mission Control (legacy)", href: "/admin/intelligence", desc: "Redirects to Brain" },
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
