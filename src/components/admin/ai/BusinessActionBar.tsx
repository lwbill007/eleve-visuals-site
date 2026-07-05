"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BusinessAction } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const actionStyles: Record<BusinessAction["type"], string> = {
  navigate: "border-stone/30 text-fog hover:border-accent/40 hover:text-cream",
  create_campaign: "border-accent/30 text-accent hover:bg-accent/10",
  email_clients: "border-blue-500/30 text-blue-300 hover:bg-blue-500/10",
  instagram_draft: "border-pink-500/30 text-pink-300 hover:bg-pink-500/10",
  open_crm: "border-stone/30 text-fog hover:border-accent/40",
  create_workflow: "border-amber-500/30 text-amber-300 hover:bg-amber-500/10",
  export_report: "border-stone/30 text-fog hover:border-accent/40",
  sponsor_pdf: "border-stone/30 text-fog hover:border-accent/40",
  schedule_followup: "border-green-500/30 text-green-300 hover:bg-green-500/10",
  generate_draft: "border-accent/30 text-accent hover:bg-accent/10",
};

function buildHref(action: BusinessAction): string {
  const url = new URL(action.href, "http://local");
  if (action.task) url.searchParams.set("task", action.task);
  if (action.prompt) url.searchParams.set("prompt", action.prompt);
  return `${url.pathname}${url.search}`;
}

export function BusinessActionButton({
  action,
  compact = false,
  className,
}: {
  action: BusinessAction;
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const href = buildHref(action);

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        router.push(href);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border transition-colors",
        compact ? "px-2.5 py-1 text-[0.65rem]" : "px-3 py-1.5 text-xs",
        "tracking-[0.08em] uppercase",
        actionStyles[action.type],
        className
      )}
    >
      {action.label}
    </Link>
  );
}

export function BusinessActionBar({
  actions,
  compact = false,
  className,
}: {
  actions: BusinessAction[];
  compact?: boolean;
  className?: string;
}) {
  if (!actions.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((a) => (
        <BusinessActionButton key={a.id} action={a} compact={compact} />
      ))}
    </div>
  );
}
