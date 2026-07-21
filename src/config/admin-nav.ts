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
  items: OS_PAGES.filter((p) => p.system === system && p.primary !== false).map((p) => ({
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
export const ADMIN_SECONDARY_NAV: AdminNavItem[] = OS_PAGES.filter(
  (page) => page.primary === false
).map((page) => ({
  label: page.label,
  href: page.href,
  desc: page.purpose,
}));

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
