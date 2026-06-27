"use client";

import { formatLocalWithUtc } from "@/lib/datetime";

export function TimeStamp({
  iso,
  showUtc = false,
  className,
}: {
  iso: string;
  showUtc?: boolean;
  className?: string;
}) {
  const { local, utc, tz } = formatLocalWithUtc(iso);
  return (
    <span className={className} title={`${utc}${tz ? ` · ${tz}` : ""}`}>
      {local}
      {showUtc && <span className="ml-1 text-muted">({utc})</span>}
    </span>
  );
}
