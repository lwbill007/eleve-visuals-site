import type { KnowledgeFinding, PlatformIssue } from "./types";
import { stableHash } from "./memory-diff";
import { getMemory, writeMemory } from "../store";
import { getWorkspaceId } from "../workspace";

export interface ScanSnapshot {
  capturedAt: string;
  routeCount: number;
  routes: string[];
  fingerprints: Record<string, string>;
  pricingByPage: Record<string, string[]>;
  ctasByPage: Record<string, string[]>;
  seoByPage: Record<string, { score: number; issues: string[] }>;
  navigationHash: string;
}

export interface PlatformChange {
  type:
    | "new_page"
    | "deleted_page"
    | "pricing_change"
    | "cta_change"
    | "seo_change"
    | "navigation_change"
    | "content_change"
    | "branding_change"
    | "offer_change"
    | "session_update"
    | "gallery_change"
    | "broken_link";
  severity: "high" | "medium" | "low";
  page: string;
  title: string;
  detail: string;
  before?: string;
  after?: string;
}

const SNAPSHOT_KEY = "latest";

function pageFingerprint(f: KnowledgeFinding): string {
  return stableHash({
    summary: f.summary,
    purpose: f.pagePurpose,
    value: f.value,
  });
}

export function buildScanSnapshot(findings: KnowledgeFinding[], routes: string[]): ScanSnapshot {
  const fingerprints: Record<string, string> = {};
  const pricingByPage: Record<string, string[]> = {};
  const ctasByPage: Record<string, string[]> = {};
  const seoByPage: Record<string, { score: number; issues: string[] }> = {};

  for (const f of findings) {
    fingerprints[f.sourcePage] = pageFingerprint(f);
    pricingByPage[f.sourcePage] = (f.value.pricing as string[]) ?? [];
    const ctas = (f.value.ctas as { label: string; href: string }[]) ?? [];
    ctasByPage[f.sourcePage] = ctas.map((c) => `${c.label}→${c.href}`);
    const seo = f.value.seo as { score?: number; issues?: string[] } | undefined;
    seoByPage[f.sourcePage] = { score: seo?.score ?? 0, issues: seo?.issues ?? [] };
  }

  const navFinding = findings.find((f) => f.key === "homepage" || f.category === "page");
  const navigationHash = stableHash({
    nav: navFinding?.value.navigation ?? {},
  });

  return {
    capturedAt: new Date().toISOString(),
    routeCount: routes.length,
    routes: [...routes].sort(),
    fingerprints,
    pricingByPage,
    ctasByPage,
    seoByPage,
    navigationHash,
  };
}

export async function loadPreviousSnapshot(): Promise<ScanSnapshot | null> {
  const mem = await getMemory("operational", "scan_snapshot", SNAPSHOT_KEY, getWorkspaceId());
  if (!mem?.value) return null;
  return mem.value as unknown as ScanSnapshot;
}

export async function saveScanSnapshot(snapshot: ScanSnapshot): Promise<void> {
  await writeMemory({
    workspaceId: getWorkspaceId(),
    layer: "operational",
    category: "scan_snapshot",
    key: SNAPSHOT_KEY,
    title: "Platform scan snapshot",
    summary: `${snapshot.routeCount} routes · ${snapshot.capturedAt}`,
    value: snapshot as unknown as Record<string, unknown>,
    confidence: 1,
    importance: 80,
    source: "sync",
    sourceRef: "scan:snapshot",
    tags: ["platform-scan", "snapshot"],
    actor: "refresh-intelligence",
    reason: "Baseline for change detection",
    verified: true,
  });
}

export function detectPlatformChanges(
  previous: ScanSnapshot | null,
  current: ScanSnapshot,
  findings: KnowledgeFinding[]
): PlatformChange[] {
  if (!previous) {
    return current.routes.map((page) => ({
      type: "new_page" as const,
      severity: "low" as const,
      page,
      title: "Initial discovery",
      detail: "First intelligence refresh — page indexed",
    }));
  }

  const changes: PlatformChange[] = [];
  const prevRoutes = new Set(previous.routes);
  const currRoutes = new Set(current.routes);

  for (const page of current.routes) {
    if (!prevRoutes.has(page)) {
      changes.push({
        type: "new_page",
        severity: "medium",
        page,
        title: "New page discovered",
        detail: "Route appeared since last refresh",
      });
    }
  }

  for (const page of previous.routes) {
    if (!currRoutes.has(page)) {
      changes.push({
        type: "deleted_page",
        severity: "high",
        page,
        title: "Page removed",
        detail: "Route no longer discovered — verify redirect or archive",
      });
    }
  }

  for (const page of current.routes) {
    const prevFp = previous.fingerprints[page];
    const currFp = current.fingerprints[page];
    if (prevFp && currFp && prevFp !== currFp) {
      const finding = findings.find((f) => f.sourcePage === page);
      changes.push({
        type: finding?.category === "volume" ? "session_update" : "content_change",
        severity: "medium",
        page,
        title: "Content changed",
        detail: finding?.title ?? "Semantic fingerprint changed",
      });
    }

    const prevPricing = (previous.pricingByPage[page] ?? []).join("|");
    const currPricing = (current.pricingByPage[page] ?? []).join("|");
    if (prevPricing && currPricing && prevPricing !== currPricing) {
      changes.push({
        type: "pricing_change",
        severity: "high",
        page,
        title: "Pricing updated",
        detail: "Service or package pricing changed",
        before: prevPricing,
        after: currPricing,
      });
    }

    const prevCtas = (previous.ctasByPage[page] ?? []).join("|");
    const currCtas = (current.ctasByPage[page] ?? []).join("|");
    if (prevCtas && currCtas && prevCtas !== currCtas) {
      changes.push({
        type: "cta_change",
        severity: "medium",
        page,
        title: "CTA changed",
        detail: "Call-to-action updated",
        before: prevCtas,
        after: currCtas,
      });
    }

    const prevSeo = previous.seoByPage[page];
    const currSeo = current.seoByPage[page];
    if (prevSeo && currSeo && (prevSeo.score !== currSeo.score || prevSeo.issues.join() !== currSeo.issues.join())) {
      changes.push({
        type: "seo_change",
        severity: currSeo.score < prevSeo.score ? "medium" : "low",
        page,
        title: "SEO profile changed",
        detail: `Score ${prevSeo.score} → ${currSeo.score}`,
      });
    }
  }

  if (previous.navigationHash !== current.navigationHash) {
    changes.push({
      type: "navigation_change",
      severity: "medium",
      page: "/",
      title: "Navigation structure changed",
      detail: "Site navigation links updated",
    });
  }

  for (const f of findings) {
    for (const issue of f.issues) {
      if (issue.type === "missing_content" && issue.severity === "high") {
        changes.push({
          type: "broken_link",
          severity: "high",
          page: issue.page,
          title: issue.title,
          detail: issue.detail,
        });
      }
    }
  }

  return changes;
}

export function changesToIssues(changes: PlatformChange[]): PlatformIssue[] {
  return changes
    .filter((c) => c.severity === "high" || c.type === "deleted_page")
    .map((c) => ({
      type: c.type === "seo_change" ? "seo" : c.type === "cta_change" ? "conversion" : "outdated",
      severity: c.severity,
      title: c.title,
      detail: c.detail,
      page: c.page,
    }));
}
