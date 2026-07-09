"use client";

import Link from "next/link";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import { ExecuteButton } from "@/components/admin/ai/ExecuteButton";
import { cn } from "@/lib/utils";

export function WorkspaceRelated({
  links,
}: {
  links: { label: string; href: string; desc?: string }[];
}) {
  if (links.length === 0) return null;
  return (
    <AdminPanel title="Related" subtitle="Connected workspaces" className="mt-8">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link
            key={l.href + l.label}
            href={l.href}
            className="rounded-lg border border-stone/20 px-3 py-2.5 transition-colors hover:border-accent/40"
          >
            <p className="text-sm text-cream">{l.label}</p>
            {l.desc && <p className="mt-0.5 text-[0.65rem] text-muted">{l.desc}</p>}
          </Link>
        ))}
      </div>
    </AdminPanel>
  );
}

/** Compact AI posture strip from shared Executive Context. */
export function WorkspaceAIStrip({ className }: { className?: string }) {
  const { context, loading, refresh } = useExecutiveContext();
  if (loading && !context) {
    return (
      <div className={cn("mb-6 h-16 animate-pulse rounded-xl border border-stone/20 bg-charcoal/20", className)} />
    );
  }
  if (!context) return null;
  const action = context.nextAction;
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 rounded-xl border border-accent/25 bg-accent/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-[0.55rem] tracking-[0.14em] text-accent uppercase">AI · Business Brain</p>
        <p className="mt-1 truncate text-sm text-cream">
          {action?.title ?? context.headline}
        </p>
        {action?.why && <p className="mt-0.5 line-clamp-1 text-xs text-fog">{action.why}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => refresh()}
          className="rounded-lg border border-stone/30 px-3 py-1.5 text-[0.6rem] tracking-[0.08em] text-fog uppercase hover:text-cream"
        >
          Refresh brain
        </button>
        {action && (
          <ExecuteButton
            target={{
              id: action.id,
              title: action.title,
              href: action.href,
              actionLabel: action.actionLabel,
              kind: action.executeKind,
            }}
            onDone={refresh}
          />
        )}
      </div>
    </div>
  );
}

export function WorkspaceError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-6 text-center">
      <p className="text-sm text-red-300">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-stone/30 px-4 py-2 text-xs text-fog uppercase hover:border-accent hover:text-accent"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function WorkspaceEmpty({
  title,
  detail,
  actionHref,
  actionLabel,
}: {
  title: string;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <AdminPanel title={title}>
      <p className="text-sm text-fog">{detail}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="mt-4 inline-block text-sm text-accent hover:underline">
          {actionLabel} →
        </Link>
      )}
    </AdminPanel>
  );
}

export function WorkspaceLoading({ rows = 4 }: { rows?: number }) {
  return <AdminPageSkeleton rows={rows} />;
}

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  onRefresh,
  refreshing,
  extra,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <AdminPageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {extra}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="rounded-lg border border-stone/30 px-3 py-2 text-[0.65rem] tracking-[0.1em] text-fog uppercase hover:border-accent hover:text-accent disabled:opacity-40"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          )}
        </div>
      }
    />
  );
}
