/**
 * Launch-complete IA — six systems, one business question per page.
 * Labels match ÉLEVÉ OS; secondary CMS stays out of primary nav.
 */

import { OS_PAGES, OS_SYSTEM_LABELS, type OsSystemId } from "@/lib/ai/platform/os-systems";

export type AdminNavItem = {
  label: string;
  href: string;
  desc?: string;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

const SYSTEM_ORDER: OsSystemId[] = ["command", "work", "create", "grow", "brain", "trust"];

export const ADMIN_NAV: AdminNavSection[] = SYSTEM_ORDER.map((system) => ({
  label: OS_SYSTEM_LABELS[system].label,
  items: OS_PAGES.filter((p) => p.system === system).map((p) => ({
    label: p.label,
    href: p.href,
    desc: p.question,
  })),
}));

export const ADMIN_QUICK_ACTIONS = [
  { label: "AI Briefing", href: "/admin/briefing", desc: "Why did it happen?" },
  { label: "Execute next", href: "/admin/opportunities", desc: "How do we grow?" },
  { label: "Workboard", href: "/admin/workboard", desc: "What must I execute?" },
  { label: "Clients", href: "/admin/crm", desc: "Who is this customer?" },
  { label: "Financial Center", href: "/admin/financial", desc: "Where is the money?" },
  { label: "Business Brain", href: "/admin/memory", desc: "What have we learned?" },
];

/** Live secondary workspaces — command palette only (not primary OS nav). */
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
  { label: "Payments (legacy)", href: "/admin/payments", desc: "Redirects to Financial Center" },
  { label: "AI Health (legacy)", href: "/admin/ai-health", desc: "Redirects to AI Operations" },
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
