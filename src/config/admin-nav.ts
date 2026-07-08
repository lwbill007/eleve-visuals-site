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
 * OS IA — all roadmap phases surfaced.
 * Command · Work · Make · Grow · Brain · Trust
 */
export const ADMIN_NAV: AdminNavSection[] = [
  {
    label: "Command",
    items: [
      { label: "Command Center", href: "/admin", desc: "Brief · health · execute next" },
      { label: "Opportunities", href: "/admin/opportunities", desc: "Ranked queue · one-click execute" },
      { label: "Risks", href: "/admin/risks", desc: "Attention · blockers" },
      { label: "Revenue Leaks", href: "/admin/leaks", desc: "Lost money · recovery paths" },
    ],
  },
  {
    label: "Work",
    items: [
      { label: "Workboard", href: "/admin/workboard", desc: "Inbox + stale deals" },
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
      { label: "Email", href: "/admin/email", desc: "Send follow-ups · Resend" },
      { label: "Marketing", href: "/admin/marketing", desc: "Campaigns · captions · plans" },
      { label: "Analytics", href: "/admin/analytics", desc: "Traffic · conversions" },
      { label: "Website", href: "/admin/homepage", desc: "Homepage · pages · SEO" },
    ],
  },
  {
    label: "Brain",
    items: [
      { label: "Business Brain", href: "/admin/memory", desc: "Know · decide · simulate · graph" },
      { label: "Timeline", href: "/admin/timeline", desc: "Irreversible business events" },
    ],
  },
  {
    label: "Trust",
    items: [
      { label: "Missing Intel", href: "/admin/qa", desc: "Connectors · confidence gaps" },
      { label: "Payments", href: "/admin/payments", desc: "Settled cash · Verified revenue" },
      { label: "Automations", href: "/admin/automations", desc: "Runnable system jobs" },
      { label: "Notifications", href: "/admin/notifications", desc: "Delivery & alerts" },
      { label: "Settings", href: "/admin/settings", desc: "Brand · SEO · contact" },
    ],
  },
];

export const ADMIN_QUICK_ACTIONS = [
  { label: "Execute next", href: "/admin/opportunities", desc: "Highest-impact action" },
  { label: "Workboard", href: "/admin/workboard", desc: "Inbox + stale deals" },
  { label: "Revenue leaks", href: "/admin/leaks", desc: "Recover lost money" },
  { label: "Send email", href: "/admin/email", desc: "Follow-up templates" },
  { label: "Payments", href: "/admin/payments", desc: "Verified cash" },
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
