"use client";

import type { ExecutiveOS } from "@/lib/ai/executive/types";
import { ExecutiveOperatingSystemView } from "@/components/admin/ai/ExecutiveOperatingSystem";

export function ExecutiveCommandCenter({
  os,
  onRefresh,
}: {
  os: ExecutiveOS;
  onRefresh?: () => void;
}) {
  if (!os.operatingSystem) {
    return <p className="text-fog">Loading operating system…</p>;
  }

  return <ExecutiveOperatingSystemView os={os.operatingSystem} onRefresh={onRefresh} />;
}
