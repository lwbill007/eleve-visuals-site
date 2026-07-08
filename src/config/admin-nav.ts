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
 * Workspace-oriented navigation for ÉLEVÉ OS.
 * Primary modules first; secondary tools live under System / More.
 * Scaffold pages (email, forms, referrals, content-hub) stay reachable via
 * command palette / quick actions but are not promoted in the primary nav.
 */
export const ADMIN_NAV: AdminNavSection[] = [
  {
    label: "Command Center",
    items: [
      { label: "Home", href: "/admin", desc: "Executive command center · today’s priorities" },
      { label: "AI Briefing", href: "/admin/intelligence", desc: "Command Center · decision engine · THE ONE THING" },
      { label: "Opportunities", href: "/admin/opportunities", desc: "Highest ROI actions" },
      { label: "Risks", href: "/admin/risks", desc: "Early warnings" },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Pipeline", href: "/admin/pipeline", desc: "Lead kanban · expected revenue" },
      { label: "Clients", href: "/admin/crm", desc: "CRM profiles · AI summaries" },
      { label: "Bookings", href: "/admin/submissions?type=booking", desc: "Booking inquiries" },
      { label: "Booking AI", href: "/admin/bookings-ai", desc: "Forecasts & pricing" },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "Marketing", href: "/admin/marketing", desc: "Campaigns · captions · learning" },
      { label: "Analytics", href: "/admin/analytics", desc: "Traffic & conversions" },
      { label: "Automations", href: "/admin/automations", desc: "Workflow builder" },
      { label: "Reports", href: "/admin/reports", desc: "Business intelligence" },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Sessions", href: "/admin/sessions-hub", desc: "Volumes & applications hub" },
      { label: "Volumes", href: "/admin/sessions", desc: "Manage session volumes" },
      { label: "Applications", href: "/admin/applications", desc: "Applicant pipeline" },
      { label: "Portfolio", href: "/admin/portfolio", desc: "Work archive" },
      { label: "Media", href: "/admin/media", desc: "Asset library" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Business Brain", href: "/admin/memory", desc: "Knowledge · graph · learning · DNA" },
      { label: "Insights", href: "/admin/insights", desc: "Detailed recommendations" },
      { label: "Executive QA", href: "/admin/qa", desc: "Production readiness" },
    ],
  },
  {
    label: "Website",
    items: [
      { label: "Homepage", href: "/admin/homepage", desc: "Hero & sections" },
      { label: "Services", href: "/admin/services", desc: "Offerings" },
      { label: "Testimonials", href: "/admin/testimonials", desc: "Social proof" },
      { label: "Page Copy", href: "/admin/content", desc: "Global copy" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Notifications", href: "/admin/notifications", desc: "Delivery & alerts" },
      { label: "Sponsorship", href: "/admin/sponsorship", desc: "Sponsor metrics" },
      { label: "Settings", href: "/admin/settings", desc: "Brand & SEO" },
    ],
  },
];

export const ADMIN_QUICK_ACTIONS = [
  { label: "Do next opportunity", href: "/admin/opportunities", desc: "Highest-impact action" },
  { label: "Review pipeline", href: "/admin/pipeline", desc: "Move leads forward" },
  { label: "Create campaign", href: "/admin/marketing?task=campaign", desc: "AI marketing studio" },
  { label: "Draft follow-up", href: "/admin/marketing?task=follow_up", desc: "Re-engage warm leads" },
  { label: "Session applications", href: "/admin/applications", desc: "Review applicants" },
  { label: "Publish gallery", href: "/admin/portfolio", desc: "Add portfolio work" },
  { label: "Refresh Business Brain", href: "/admin/memory", desc: "Cognitive architecture" },
  { label: "Executive QA", href: "/admin/qa", desc: "Production readiness" },
];

/** Secondary destinations kept for command palette / deep links (not primary nav). */
export const ADMIN_SECONDARY_NAV: AdminNavItem[] = [
  { label: "Referrals", href: "/admin/referrals", desc: "Ambassador program (preview)" },
  { label: "Email", href: "/admin/email", desc: "Campaigns (preview)" },
  { label: "Forms", href: "/admin/forms", desc: "Intake forms (preview)" },
  { label: "Content Hub", href: "/admin/content-hub", desc: "Multi-channel (preview)" },
  { label: "About Page", href: "/admin/about", desc: "About content" },
  { label: "Contact Page", href: "/admin/contact", desc: "Contact content" },
  { label: "All submissions", href: "/admin/submissions", desc: "Every inquiry type" },
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
