"use client";

import Link from "next/link";
import { AdminPageHeader, AdminPanel, AdminEmptyState } from "@/components/admin/os/AdminOSComponents";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { useExecutiveContext } from "@/components/admin/ai/ExecutiveContextProvider";
import { ExecuteButton } from "@/components/admin/ai/ExecuteButton";
import { cn } from "@/lib/utils";

/** Shared control chrome — one look for refresh / secondary / primary. */
export function WorkspaceButton({
  children,
  onClick,
  href,
  variant = "secondary",
  disabled,
  type = "button",
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles = cn(
    "inline-flex min-h-9 items-center justify-center rounded-lg px-3 py-2 text-[0.65rem] tracking-[0.1em] uppercase transition-colors disabled:opacity-40",
    variant === "primary" &&
      "border border-accent/40 bg-accent/15 text-accent hover:bg-accent/25",
    variant === "secondary" &&
      "border border-stone/30 text-fog hover:border-accent/40 hover:text-accent",
    variant === "ghost" && "border border-transparent text-muted hover:text-cream",
    className
  );
  if (href) {
    return (
      <Link href={href} className={styles}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={styles}>
      {children}
    </button>
  );
}

export function WorkspaceRelated({
  links,
}: {
  links: { label: string; href: string; desc?: string }[];
}) {
  if (links.length === 0) return null;
  return (
    <AdminPanel title="Related workspaces" subtitle="Stay in flow — jump without hunting" className="mt-10">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link
            key={l.href + l.label}
            href={l.href}
            className="rounded-lg border border-stone/20 px-3 py-2.5 transition-colors hover:border-accent/40 hover:bg-charcoal/30"
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
  const { context, loading, error, refresh } = useExecutiveContext();
  if (loading && !context) {
    return (
      <div
        className={cn("mb-6 h-16 animate-pulse rounded-xl border border-stone/20 bg-charcoal/20", className)}
        aria-busy="true"
      />
    );
  }
  if (!context) {
    if (!error) return null;
    return (
      <div
        role="alert"
        className={cn(
          "mb-6 flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
          className
        )}
      >
        <p className="text-sm text-amber-200">Business Brain unavailable — {error}</p>
        <WorkspaceButton variant="secondary" onClick={() => refresh()}>
          Retry
        </WorkspaceButton>
      </div>
    );
  }
  const action = context.nextAction;
  const health = context.health?.overall;
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 rounded-xl border border-accent/25 bg-accent/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[0.55rem] tracking-[0.14em] text-accent uppercase">AI · Business Brain</p>
          {health && (
            <span className="rounded-full border border-stone/30 px-1.5 py-0.5 text-[0.5rem] tracking-[0.08em] text-muted uppercase">
              Health {health.score} · {health.label}
            </span>
          )}
          <span className="rounded-full border border-stone/30 px-1.5 py-0.5 text-[0.5rem] tracking-[0.08em] text-muted uppercase">
            Trust {context.trustScore}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-cream">{action?.title ?? context.headline}</p>
        {action?.why && <p className="mt-0.5 line-clamp-1 text-xs text-fog">{action.why}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <WorkspaceButton variant="ghost" onClick={() => refresh()}>
          Refresh brain
        </WorkspaceButton>
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
    <div
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-8 text-center"
    >
      <p className="font-display text-lg text-cream">Something went wrong</p>
      <p className="mt-2 text-sm text-red-300/90">{message}</p>
      {onRetry && (
        <div className="mt-5">
          <WorkspaceButton variant="primary" onClick={onRetry}>
            Retry
          </WorkspaceButton>
        </div>
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
    <div className="rounded-xl border border-dashed border-stone/30 px-6 py-12 text-center">
      <p className="font-display text-xl text-cream-dim">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{detail}</p>
      {actionHref && actionLabel && (
        <div className="mt-5">
          <WorkspaceButton href={actionHref} variant="primary">
            {actionLabel}
          </WorkspaceButton>
        </div>
      )}
    </div>
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
  shortcutHint = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  extra?: React.ReactNode;
  shortcutHint?: boolean;
}) {
  return (
    <AdminPageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {shortcutHint && (
            <span className="hidden items-center gap-1.5 text-[0.6rem] tracking-[0.08em] text-muted uppercase sm:inline-flex">
              Jump <kbd className="rounded border border-stone/40 px-1.5 py-0.5 text-[0.55rem]">⌘K</kbd>
            </span>
          )}
          {extra}
          {onRefresh && (
            <WorkspaceButton variant="secondary" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? "Refreshing…" : "Refresh"}
            </WorkspaceButton>
          )}
        </div>
      }
    />
  );
}

/** Consistent search + filter row. */
export function WorkspaceToolbar({
  search,
  onSearch,
  searchPlaceholder = "Search…",
  children,
}: {
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {onSearch && (
        <input
          type="search"
          value={search ?? ""}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="min-w-[12rem] flex-1 rounded-lg border border-stone/40 bg-charcoal/40 px-3 py-2.5 text-sm text-cream outline-none focus:border-accent/50"
        />
      )}
      {children}
    </div>
  );
}

/**
 * Full workspace chrome: header → AI strip → children → related.
 * Use this as the outer layout for polished pages.
 */
export function WorkspaceChrome({
  eyebrow,
  title,
  description,
  onRefresh,
  refreshing,
  extra,
  related,
  children,
  showAI = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  extra?: React.ReactNode;
  related?: { label: string; href: string; desc?: string }[];
  children: React.ReactNode;
  showAI?: boolean;
}) {
  return (
    <div className="space-y-0">
      <WorkspaceHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        onRefresh={onRefresh}
        refreshing={refreshing}
        extra={extra}
      />
      {showAI && <WorkspaceAIStrip />}
      {children}
      {related && related.length > 0 && <WorkspaceRelated links={related} />}
    </div>
  );
}

/** Re-export empty for pages that already import AdminEmptyState patterns */
export { AdminEmptyState };
