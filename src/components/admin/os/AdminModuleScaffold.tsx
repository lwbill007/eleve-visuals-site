import Link from "next/link";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";

export function AdminModuleScaffold({
  eyebrow,
  title,
  description,
  features,
  links,
  status = "preview",
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
        <AdminPageHeader eyebrow={eyebrow} title={title} description={description} />
        <span
          className={
            status === "live"
              ? "rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[0.6rem] tracking-[0.12em] text-green-400 uppercase"
              : "rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[0.6rem] tracking-[0.12em] text-amber-300 uppercase"
          }
        >
          {status === "live" ? "Live" : "Preview — use available tools below"}
        </span>
      </div>

      {links.length > 0 && (
        <div>
          <p className="mb-3 label-caps text-accent">Available now</p>
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
          </div>
        </div>
      )}

      <AdminPanel title="Coming to ÉLEVÉ OS" subtitle="On the roadmap — each capability ties to revenue or time saved">
        <ul className="grid gap-2 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-fog">
              <span className="text-accent/70">◆</span>
              {f}
            </li>
          ))}
        </ul>
      </AdminPanel>
    </div>
  );
}
