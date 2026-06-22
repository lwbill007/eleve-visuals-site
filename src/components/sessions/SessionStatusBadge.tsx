import { cn } from "@/lib/utils";
import { getSessionStatusLabel } from "@/lib/session-volume";
import type { SessionVolumeStatus } from "@/lib/types";

const STATUS_STYLES: Record<SessionVolumeStatus, string> = {
  draft: "border-stone/50 text-muted",
  coming_soon: "border-fog/40 text-fog",
  applications_open: "border-accent/60 text-accent",
  applications_closed: "border-stone/60 text-fog",
  sold_out: "border-red-400/40 text-red-300",
  archived: "border-stone/40 text-muted",
};

export function SessionStatusBadge({
  status,
  className,
}: {
  status: SessionVolumeStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block border px-2.5 py-1 text-[0.6rem] tracking-[0.2em] uppercase",
        STATUS_STYLES[status],
        className
      )}
    >
      {getSessionStatusLabel(status)}
    </span>
  );
}
