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
      { label: "Dashboard", href: "/admin", desc: "Business overview" },
      { label: "ÉLEVÉ AI", href: "/admin/assistant", desc: "Business assistant" },
      { label: "AI Insights", href: "/admin/insights", desc: "Recommended actions" },
      { label: "Analytics", href: "/admin/analytics", desc: "Traffic & conversions" },
      { label: "Reports", href: "/admin/reports", desc: "AI business intelligence" },
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
      { label: "Settings", href: "/admin/settings", desc: "Brand & SEO" },
    ],
  },
];

export const ADMIN_QUICK_ACTIONS = [
  { label: "Create Campaign", href: "/admin/email", desc: "Email marketing" },
  { label: "Open Applications", href: "/admin/sessions", desc: "Sessions volume settings" },
  { label: "Publish Gallery", href: "/admin/portfolio", desc: "Add portfolio work" },
  { label: "Add Portfolio", href: "/admin/portfolio", desc: "New project" },
  { label: "Review Pipeline", href: "/admin/pipeline", desc: "Move leads forward" },
  { label: "Send Newsletter", href: "/admin/email", desc: "Reach your list" },
  { label: "Session Applications", href: "/admin/applications", desc: "Review applicants" },
  { label: "Upload Media", href: "/admin/media", desc: "Asset library" },
];

export const ADMIN_COMMANDS = ADMIN_NAV.flatMap((section) =>
  section.items.map((item) => ({
    ...item,
    section: section.label,
    keywords: `${item.label} ${section.label} ${item.desc ?? ""}`.toLowerCase(),
  }))
);
