export type AdminNavItem = {
  label: string;
  href: string;
  desc?: string;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavSection[] = [
  {
    label: "Command Center",
    items: [
      { label: "Dashboard", href: "/admin", desc: "Executive command center" },
      { label: "Executive Intelligence", href: "/admin/intelligence", desc: "Morning briefing, scores, forecasts" },
      { label: "Opportunities", href: "/admin/opportunities", desc: "Highest ROI actions" },
      { label: "Risk Center", href: "/admin/risks", desc: "Early warnings" },
      { label: "Knowledge Engine", href: "/admin/memory", desc: "Business knowledge & learning" },
      { label: "AI Insights", href: "/admin/insights", desc: "Detailed recommendations" },
      { label: "Analytics", href: "/admin/analytics", desc: "Traffic & conversions" },
      { label: "Reports", href: "/admin/reports", desc: "Business intelligence" },
    ],
  },
  {
    label: "Revenue",
    items: [
      { label: "Lead Pipeline", href: "/admin/pipeline", desc: "Kanban CRM" },
      { label: "CRM", href: "/admin/crm", desc: "Client profiles" },
      { label: "Booking Assistant", href: "/admin/bookings-ai", desc: "Forecasts & pricing" },
      { label: "Bookings", href: "/admin/submissions?type=booking", desc: "Booking inquiries" },
      { label: "Referrals", href: "/admin/referrals", desc: "Ambassador program" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Marketing Studio", href: "/admin/marketing", desc: "AI content generation" },
      { label: "Email", href: "/admin/email", desc: "Campaigns & templates" },
      { label: "Automations", href: "/admin/automations", desc: "Workflow builder" },
      { label: "Forms", href: "/admin/forms", desc: "Intake forms" },
      { label: "Sponsorship", href: "/admin/sponsorship", desc: "Sponsor metrics" },
    ],
  },
  {
    label: "ÉLEVÉ Sessions",
    items: [
      { label: "Sessions Hub", href: "/admin/sessions-hub", desc: "Volumes & analytics" },
      { label: "Volumes", href: "/admin/sessions", desc: "Manage volumes" },
      { label: "Applications", href: "/admin/applications", desc: "Applicant pipeline" },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Content Hub", href: "/admin/content-hub", desc: "Multi-channel publish" },
      { label: "Portfolio", href: "/admin/portfolio", desc: "Work archive" },
      { label: "Services", href: "/admin/services", desc: "Offerings" },
      { label: "Homepage", href: "/admin/homepage", desc: "Hero & sections" },
      { label: "Media Library", href: "/admin/media", desc: "Assets" },
      { label: "Testimonials", href: "/admin/testimonials", desc: "Social proof" },
    ],
  },
  {
    label: "Site",
    items: [
      { label: "Submissions", href: "/admin/submissions", desc: "All inquiries" },
      { label: "Notifications", href: "/admin/notifications", desc: "Delivery & alerts" },
      { label: "Page Copy", href: "/admin/content", desc: "Global copy" },
      { label: "About Page", href: "/admin/about", desc: "About content" },
      { label: "Contact Page", href: "/admin/contact", desc: "Contact content" },
      { label: "Settings", href: "/admin/settings", desc: "Brand & SEO" },
    ],
  },
];

export const ADMIN_QUICK_ACTIONS = [
  { label: "Create Campaign", href: "/admin/marketing?task=campaign", desc: "AI marketing studio" },
  { label: "Open Applications", href: "/admin/sessions", desc: "Sessions volume settings" },
  { label: "Publish Gallery", href: "/admin/portfolio", desc: "Add portfolio work" },
  { label: "Review Pipeline", href: "/admin/pipeline", desc: "Move leads forward" },
  { label: "Draft Follow-Up", href: "/admin/marketing?task=follow_up", desc: "Re-engage warm leads" },
  { label: "Session Applications", href: "/admin/applications", desc: "Review applicants" },
  { label: "Upload Media", href: "/admin/media", desc: "Asset library" },
  { label: "Executive Intelligence", href: "/admin/intelligence", desc: "Morning briefing & strategy" },
];

export const ADMIN_COMMANDS = ADMIN_NAV.flatMap((section) =>
  section.items.map((item) => ({
    ...item,
    section: section.label,
    keywords: `${item.label} ${section.label} ${item.desc ?? ""}`.toLowerCase(),
  }))
);
