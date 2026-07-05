import Link from "next/link";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";

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
}) {
  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow={eyebrow} title={title} description={description} />

      <AdminPanel title="Planned Capabilities">
        <ul className="grid gap-2 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-fog">
              <span className="text-accent">◆</span>
              {f}
            </li>
          ))}
        </ul>
      </AdminPanel>

      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-stone/25 p-5 transition-colors hover:border-accent/30 hover:bg-charcoal/20"
          >
            <p className="font-display text-lg text-cream">{link.label}</p>
            <p className="mt-1 text-sm text-muted">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
