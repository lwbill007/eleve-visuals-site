import Link from "next/link";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";

/**
 * Honest unavailable module — not a fake "coming soon" product surface.
 * Primary CTAs point at live tools that cover the job today.
 */
export function AdminModuleScaffold({
  eyebrow,
  title,
  description,
  features,
  links,
}: {
  eyebrow: string;
  title: string;
  description: string;
  features: string[];
  links: { label: string; href: string; desc: string }[];
  status?: "preview" | "live";
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow={eyebrow}
          title={title}
          description={`${description} This module is not available in production yet — use the live tools below.`}
        />
        <span className="rounded-full border border-stone/30 bg-charcoal/40 px-3 py-1 text-[0.6rem] tracking-[0.12em] text-muted uppercase">
          Unavailable
        </span>
      </div>

      <AdminPanel title="Use these instead" subtitle="Live paths that cover this job today">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="os-panel group rounded-xl border p-5 transition-all hover:border-accent/35 hover:bg-charcoal/30"
            >
              <p className="font-display text-lg text-cream group-hover:text-accent">{link.label}</p>
              <p className="mt-1 text-sm text-muted">{link.desc}</p>
            </Link>
          ))}
          <Link
            href="/admin"
            className="os-panel group rounded-xl border border-accent/25 p-5 transition-all hover:border-accent/45"
          >
            <p className="font-display text-lg text-accent">Back to Home</p>
            <p className="mt-1 text-sm text-muted">Mission · next actions · health</p>
          </Link>
        </div>
      </AdminPanel>

      <AdminPanel title="Planned capabilities" subtitle="Not shipping — listed for transparency only">
        <ul className="grid gap-2 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-fog">
              <span className="text-muted">·</span>
              {f}
            </li>
          ))}
        </ul>
      </AdminPanel>
    </div>
  );
}
