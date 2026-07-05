"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AdminMetricCard({
  label,
  value,
  hint,
  delta,
  href,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  delta?: number | null;
  href?: string;
  className?: string;
}) {
  const inner = (
    <>
      <p className="text-[0.65rem] tracking-[0.16em] text-muted uppercase">{label}</p>
      <p className="mt-2 font-display text-3xl text-cream sm:text-4xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-fog">{hint}</p>}
      {delta != null && (
        <p className={cn("mt-2 text-xs", delta >= 0 ? "text-emerald-400/90" : "text-red-400/90")}>
          {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% vs last month
        </p>
      )}
    </>
  );

  const classes = cn(
    "rounded-xl border border-stone/25 bg-charcoal/20 p-5 transition-all duration-300 hover:border-accent/35 hover:bg-charcoal/40",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    );
  }

  return <div className={classes}>{inner}</div>;
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="label-caps text-accent">{eyebrow}</p>}
        <h2 className="font-display text-3xl text-cream sm:text-4xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm text-fog">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminPanel({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-stone/25 bg-charcoal/10 p-5 sm:p-6", className)}>
      {(title || subtitle) && (
        <header className="mb-5">
          {title && <h3 className="font-display text-xl text-cream">{title}</h3>}
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone/30 px-6 py-12 text-center">
      <p className="font-display text-xl text-cream-dim">{title}</p>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}

export function AdminBarChart({
  data,
  labelKey,
  valueKey,
  accent = false,
}: {
  data: Record<string, string | number>[];
  labelKey: string;
  valueKey: string;
  accent?: boolean;
}) {
  const max = Math.max(...data.map((d) => Number(d[valueKey])), 1);
  const maxBarPx = 120;

  return (
    <div className="relative h-44 overflow-hidden">
      <div className="flex h-full items-end gap-2 sm:gap-3">
        {data.map((point, i) => {
          const value = Number(point[valueKey]);
          const barHeightPx = Math.max(Math.round((value / max) * maxBarPx), value > 0 ? 6 : 0);
          return (
            <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: barHeightPx, transformOrigin: "bottom center" }}
                className={cn(
                  "pointer-events-none w-full rounded-t-sm",
                  accent ? "bg-accent/80" : "bg-stone/50"
                )}
                title={String(value)}
              />
              <span className="pointer-events-none w-full truncate text-center text-[0.6rem] tracking-wide text-muted uppercase">
                {String(point[labelKey])}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminActivityFeed({
  items,
}: {
  items: {
    id: string;
    label: string;
    name?: string;
    createdAt: string;
    href: string;
    read?: boolean;
  }[];
}) {
  if (items.length === 0) {
    return <AdminEmptyState title="No activity yet" description="Submissions and events will appear here." />;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className={cn(
              "flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition-colors hover:bg-charcoal/30",
              item.read === false ? "border-accent/30 bg-accent/5" : "border-stone/20"
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-cream">
                {item.label}
                {item.name && <span className="text-fog"> · {item.name}</span>}
              </p>
              <p className="text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
            <span className="shrink-0 text-xs text-accent">→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function AdminStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    lead: "border-stone/40 text-fog",
    interested: "border-sky-500/40 text-sky-300",
    booked: "border-accent/50 text-accent",
    completed: "border-emerald-500/40 text-emerald-300",
    repeat: "border-purple-500/40 text-purple-300",
    vip: "border-amber-500/50 text-amber-300",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[0.65rem] tracking-[0.12em] uppercase",
        colors[status] ?? "border-stone/40 text-fog"
      )}
    >
      {status}
    </span>
  );
}
