/**
 * ÉLEVÉ Admin OS — living production validation audit.
 *
 * Static checks always run. Live HTTP probes run when PRODUCTION_URL
 * (or AUDIT_BASE_URL) + ADMIN_PASSWORD / E2E_ADMIN_PASSWORD are set.
 *
 * Output: docs/audits/admin-os-latest.md (+ JSON sibling)
 * Run: npm run audit:os
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { OS_PAGES, type OsPageSpec } from "../src/lib/ai/platform/os-systems";
import { METRIC_OWNERS } from "../src/lib/ai/platform/metric-owners";
import { AI_DEFINITION_OF_DONE, AI_OS_PRINCIPLES } from "../src/lib/ai/architecture";
import { listTaskSpecs } from "../src/lib/ai/tasks/registry";

const ROOT = join(import.meta.dirname ?? __dirname, "..");
const SRC = join(ROOT, "src");
const OUT_DIR = join(ROOT, "docs/audits");

type Severity = "P0" | "P1" | "P2" | "P3";
type Status = "working" | "broken" | "partial" | "unknown";

interface Finding {
  id: string;
  severity: Severity;
  category:
    | "working"
    | "broken"
    | "partial"
    | "duplicate"
    | "dead"
    | "missing"
    | "perf"
    | "security"
    | "ux"
    | "integrity"
    | "ai";
  title: string;
  detail: string;
  path?: string;
}

interface PageAudit {
  id: string;
  system: string;
  label: string;
  href: string;
  pageFile: string | null;
  pageExists: boolean;
  apis: { path: string; exists: boolean }[];
  status: Status;
  notes: string[];
}

/** Primary page → supporting APIs (GET probes / route existence). */
const PAGE_API_MAP: Record<string, string[]> = {
  home: ["/api/admin/os/dashboard", "/api/admin/ai/executive-context"],
  briefing: ["/api/admin/ai/daily-briefing"],
  opportunities: ["/api/admin/ai/executive-context", "/api/admin/ai/opportunities/outcome"],
  risks: ["/api/admin/ai/executive-context"],
  leaks: ["/api/admin/ai/leaks"],
  workboard: ["/api/admin/os/pipeline"],
  pipeline: ["/api/admin/os/pipeline"],
  bookings: ["/api/admin/submissions"],
  clients: ["/api/admin/os/crm"],
  inbox: ["/api/admin/submissions"],
  sessions: ["/api/admin/applications/stats", "/api/admin/session-volumes", "/api/admin/ai/operator"],
  volumes: ["/api/admin/session-volumes"],
  applications: ["/api/admin/applications/stats", "/api/admin/submissions", "/api/admin/ai/sessions/rank"],
  portfolio: ["/api/admin/portfolio"],
  media: ["/api/admin/media"],
  marketing: ["/api/admin/ai/marketing/intelligence"],
  email: ["/api/admin/email/send"],
  analytics: ["/api/admin/analytics"],
  website: ["/api/admin/ai/website-intelligence"],
  homepage: ["/api/admin/content"],
  reports: ["/api/admin/ai/reports"],
  memory: ["/api/admin/ai/memory"],
  research: ["/api/admin/ai/research"],
  timeline: ["/api/admin/ai/timeline"],
  "booking-intelligence": ["/api/admin/ai/bookings"],
  qa: ["/api/admin/ai/qa"],
  financial: ["/api/admin/payments"],
  automations: ["/api/admin/ai/automations"],
  "ai-operations": ["/api/admin/ai/health"],
  notifications: ["/api/admin/notifications/health", "/api/admin/ai/notifications"],
  settings: ["/api/admin/content"],
};

const FORBIDDEN_CLIENT_IMPORTS = [
  /from\s+["']@\/lib\/db["']/,
  /from\s+["']@prisma\/client["']/,
  /from\s+["']@\/lib\/ai\/intelligence\/business-operator["']/,
  /from\s+["']@\/lib\/ai\/intelligence\/website-engine["'](?!-types)/,
  /from\s+["']@\/lib\/ai\/platform\/command-home["'](?!-types)/,
  /from\s+["']@\/lib\/ai\/platform\/resolve-command-kpis["']/,
  /from\s+["']@\/lib\/analytics-server["']/,
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory() && name !== "node_modules") out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

function rel(f: string) {
  return relative(ROOT, f);
}

function read(f: string) {
  return readFileSync(f, "utf8");
}

function hrefToPageFile(href: string): string | null {
  const pathOnly = href.split("?")[0].replace(/\/$/, "") || "/admin";
  const withoutAdmin = pathOnly.replace(/^\/admin\/?/, "");
  if (!withoutAdmin) {
    const p = join(SRC, "app/admin/page.tsx");
    return existsSync(p) ? p : null;
  }
  const candidates = [
    join(SRC, "app/admin", withoutAdmin, "page.tsx"),
    join(SRC, "app/admin", `${withoutAdmin}.tsx`),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function apiRouteExists(apiPath: string): boolean {
  const trimmed = apiPath.replace(/^\/api\//, "").replace(/\/$/, "");
  const file = join(SRC, "app/api", trimmed, "route.ts");
  return existsSync(file);
}

function isClientFile(file: string): boolean {
  try {
    // Only the directive at the top of the module counts — ignore comments that mention "use client".
    const content = read(file);
    if (content.includes('import "server-only"') || content.includes("import 'server-only'")) {
      return false;
    }
    const lines = content.split("\n").slice(0, 30);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
        continue;
      }
      return trimmed === '"use client";' || trimmed === "'use client';" || trimmed === '"use client"' || trimmed === "'use client'";
    }
    return false;
  } catch {
    return false;
  }
}

const findings: Finding[] = [];
const pages: PageAudit[] = [];

function addFinding(f: Finding) {
  findings.push(f);
}

// ─── Page inventory ───────────────────────────────────────────────
for (const page of OS_PAGES) {
  const pageFile = hrefToPageFile(page.href);
  const apis = (PAGE_API_MAP[page.id] ?? []).map((path) => ({
    path,
    exists: apiRouteExists(path),
  }));
  const missingApis = apis.filter((a) => !a.exists);
  const notes: string[] = [];
  let status: Status = "working";

  if (!pageFile) {
    status = "broken";
    notes.push("No page.tsx found for href");
    addFinding({
      id: `page-missing-${page.id}`,
      severity: "P0",
      category: "broken",
      title: `Missing page for ${page.label}`,
      detail: `OS href ${page.href} has no matching page.tsx`,
      path: page.href,
    });
  }

  for (const missing of missingApis) {
    notes.push(`API route missing: ${missing.path}`);
    status = status === "broken" ? "broken" : "partial";
    addFinding({
      id: `api-missing-${page.id}-${missing.path}`,
      severity: "P1",
      category: "missing",
      title: `Missing API for ${page.label}`,
      detail: `${missing.path} referenced by ${page.id} but route.ts not found`,
      path: missing.path,
    });
  }

  if (pageFile && isClientFile(pageFile)) {
    const content = read(pageFile);
    for (const rx of FORBIDDEN_CLIENT_IMPORTS) {
      if (rx.test(content)) {
        status = "broken";
        notes.push(`Forbidden client import: ${rx.source}`);
        addFinding({
          id: `client-server-${page.id}`,
          severity: "P0",
          category: "broken",
          title: `Client page imports server module (${page.label})`,
          detail: `${rel(pageFile)} matches ${rx.source}`,
          path: rel(pageFile),
        });
      }
    }
  }

  pages.push({
    id: page.id,
    system: page.system,
    label: page.label,
    href: page.href,
    pageFile: pageFile ? rel(pageFile) : null,
    pageExists: Boolean(pageFile),
    apis,
    status,
    notes,
  });
}

// ─── Client component server leaks (broader) ──────────────────────
const allFiles = walk(SRC);
for (const file of allFiles) {
  if (!isClientFile(file)) continue;
  // Skip type-only imports by checking value import patterns only
  const content = read(file);
  // Ignore import type lines for website-engine / command-home
  const withoutTypeImports = content
    .split("\n")
    .filter((line) => !/^\s*import\s+type\s+/.test(line))
    .join("\n");
  for (const rx of FORBIDDEN_CLIENT_IMPORTS) {
    if (rx.test(withoutTypeImports)) {
      addFinding({
        id: `client-leak-${rel(file)}-${rx.source.slice(0, 40)}`,
        severity: "P0",
        category: "broken",
        title: "Client module imports server dependency",
        detail: `${rel(file)} matches ${rx.source}`,
        path: rel(file),
      });
    }
  }
}

// ─── Admin API auth (defense in depth) ────────────────────────────
const adminApiRoutes = allFiles.filter(
  (f) => f.includes("/app/api/admin/") && f.endsWith("/route.ts")
);
const adminApiWithoutRequireAdmin = adminApiRoutes.filter((f) => {
  const c = read(f);
  return !c.includes("requireAdmin") && !c.includes("x-vercel-signature");
});
for (const f of adminApiWithoutRequireAdmin) {
  addFinding({
    id: `auth-${rel(f)}`,
    severity: "P1",
    category: "security",
    title: "Admin API missing requireAdmin self-check",
    detail:
      "Middleware still gates /api/admin/**; self-check is defense-in-depth. Add requireAdmin.",
    path: rel(f),
  });
}

// ─── Truth layer UI bypass ────────────────────────────────────────
const uiFiles = allFiles.filter((f) => {
  const r = relative(SRC, f);
  return r.startsWith("components/") || (r.startsWith("app/") && !r.includes("/api/"));
});
for (const f of uiFiles) {
  const c = read(f);
  if (/\bgetOperatorMetrics\s*\(/.test(c) || /from\s+["']@\/lib\/ai\/intelligence\/business-operator["']/.test(c)) {
    addFinding({
      id: `truth-bypass-${rel(f)}`,
      severity: "P0",
      category: "integrity",
      title: "UI bypasses Truth Layer (getOperatorMetrics)",
      detail: rel(f),
      path: rel(f),
    });
  }
}

// ─── Metric owners integrity ──────────────────────────────────────
const ownerIds = Object.keys(METRIC_OWNERS);
if (ownerIds.length < 5) {
  addFinding({
    id: "owners-thin",
    severity: "P1",
    category: "integrity",
    title: "Metric owner registry too thin",
    detail: `Only ${ownerIds.length} owners registered`,
  });
}

// ─── AI architecture gates ────────────────────────────────────────
const taskCount = listTaskSpecs().length;
if (taskCount < 12) {
  addFinding({
    id: "task-registry-thin",
    severity: "P1",
    category: "ai",
    title: "Task registry incomplete",
    detail: `${taskCount} tasks registered`,
  });
}
if (AI_OS_PRINCIPLES.length !== 4) {
  addFinding({
    id: "principles-missing",
    severity: "P1",
    category: "ai",
    title: "AI OS principles missing",
    detail: `Expected 4 principles, found ${AI_OS_PRINCIPLES.length}`,
  });
}
if (AI_DEFINITION_OF_DONE.length < 8) {
  addFinding({
    id: "dod-thin",
    severity: "P2",
    category: "ai",
    title: "Definition of Done incomplete",
    detail: `${AI_DEFINITION_OF_DONE.length} criteria`,
  });
}

// ─── Nav ↔ OS_PAGES consistency ───────────────────────────────────
try {
  const navSrc = read(join(SRC, "config/admin-nav.ts"));
  if (!navSrc.includes("OS_PAGES")) {
    addFinding({
      id: "nav-not-derived",
      severity: "P1",
      category: "duplicate",
      title: "Admin nav not derived from OS_PAGES",
      detail: "src/config/admin-nav.ts should build from OS_PAGES",
      path: "src/config/admin-nav.ts",
    });
  }
} catch {
  addFinding({
    id: "nav-missing",
    severity: "P0",
    category: "broken",
    title: "admin-nav.ts missing",
    detail: "Cannot read src/config/admin-nav.ts",
  });
}

// ─── Legacy redirects ─────────────────────────────────────────────
for (const legacy of [
  { href: "/admin/payments", file: "src/app/admin/payments/page.tsx" },
  { href: "/admin/ai-health", file: "src/app/admin/ai-health/page.tsx" },
]) {
  const abs = join(ROOT, legacy.file);
  if (!existsSync(abs)) {
    addFinding({
      id: `legacy-${legacy.href}`,
      severity: "P2",
      category: "missing",
      title: `Legacy redirect page missing: ${legacy.href}`,
      detail: legacy.file,
      path: legacy.file,
    });
  } else if (!read(abs).includes("redirect")) {
    addFinding({
      id: `legacy-no-redirect-${legacy.href}`,
      severity: "P1",
      category: "partial",
      title: `Legacy path should redirect: ${legacy.href}`,
      detail: legacy.file,
      path: legacy.file,
    });
  }
}

// ─── Optional live probes ─────────────────────────────────────────
const BASE = process.env.AUDIT_BASE_URL || process.env.PRODUCTION_URL || "";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
const liveResults: {
  path: string;
  ok: boolean;
  status: number;
  ms: number;
  error?: string;
}[] = [];

async function runLiveProbes() {
  if (!BASE || !PASSWORD) {
    addFinding({
      id: "live-probes-skipped",
      severity: "P3",
      category: "missing",
      title: "Live HTTP probes skipped",
      detail:
        "Set AUDIT_BASE_URL (or PRODUCTION_URL) and E2E_ADMIN_PASSWORD to enable live page/API probes.",
    });
    return;
  }

  let cookie = "";
  try {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: PASSWORD }),
    });
    if (!loginRes.ok) throw new Error(`Login HTTP ${loginRes.status}`);
    const match = (loginRes.headers.get("set-cookie") ?? "").match(/eleve-admin-session=[^;]+/);
    if (!match) throw new Error("No session cookie");
    cookie = match[0];
  } catch (error) {
    addFinding({
      id: "live-login-failed",
      severity: "P0",
      category: "broken",
      title: "Live audit login failed",
      detail: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const paths = [
    ...OS_PAGES.map((p) => p.href),
    ...Object.values(PAGE_API_MAP).flat(),
  ];
  const unique = [...new Set(paths)];

  for (const path of unique) {
    const start = Date.now();
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { Cookie: cookie },
        redirect: "follow",
        signal: AbortSignal.timeout(45_000),
      });
      const ms = Date.now() - start;
      const body = path.startsWith("/api/") ? "" : await res.text();
      const crashed =
        !path.startsWith("/api/") &&
        /This module failed to load|Something broke/i.test(body);
      const ok = res.ok && !crashed;
      liveResults.push({ path, ok, status: res.status, ms });
      if (!ok) {
        addFinding({
          id: `live-${path}`,
          severity: crashed || res.status >= 500 ? "P0" : "P1",
          category: crashed ? "broken" : "partial",
          title: `Live probe failed: ${path}`,
          detail: crashed
            ? `Error boundary detected · HTTP ${res.status} · ${ms}ms`
            : `HTTP ${res.status} · ${ms}ms`,
          path,
        });
        const page = pages.find((p) => p.href === path || PAGE_API_MAP[p.id]?.includes(path));
        if (page && page.status === "working") page.status = crashed ? "broken" : "partial";
      } else if (ms > 15_000) {
        addFinding({
          id: `perf-${path}`,
          severity: "P2",
          category: "perf",
          title: `Slow response: ${path}`,
          detail: `${ms}ms`,
          path,
        });
      }
    } catch (error) {
      liveResults.push({
        path,
        ok: false,
        status: 0,
        ms: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      });
      addFinding({
        id: `live-err-${path}`,
        severity: "P0",
        category: "broken",
        title: `Live probe error: ${path}`,
        detail: error instanceof Error ? error.message : String(error),
        path,
      });
    }
  }
}

function severityRank(s: Severity) {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[s];
}

function renderMarkdown(): string {
  const sorted = [...findings].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity)
  );
  const p0 = sorted.filter((f) => f.severity === "P0");
  const p1 = sorted.filter((f) => f.severity === "P1");
  const byStatus = {
    working: pages.filter((p) => p.status === "working").length,
    partial: pages.filter((p) => p.status === "partial").length,
    broken: pages.filter((p) => p.status === "broken").length,
  };

  const lines: string[] = [
    `# ÉLEVÉ Admin OS — Audit Report`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `| --- | --- |`,
    `| OS pages | ${OS_PAGES.length} |`,
    `| Working | ${byStatus.working} |`,
    `| Partial | ${byStatus.partial} |`,
    `| Broken | ${byStatus.broken} |`,
    `| Findings P0 | ${p0.length} |`,
    `| Findings P1 | ${p1.length} |`,
    `| Findings total | ${sorted.length} |`,
    `| Admin APIs without requireAdmin | ${adminApiWithoutRequireAdmin.length} |`,
    `| Live probes | ${liveResults.length ? `${liveResults.filter((r) => r.ok).length}/${liveResults.length} ok` : "skipped"} |`,
    `| Metric owners | ${ownerIds.length} |`,
    `| AI tasks registered | ${taskCount} |`,
    ``,
    `## Gate`,
    ``,
    p0.length === 0 && p1.filter((f) => f.id !== "live-probes-skipped").length === 0
      ? `**PASS** — no blocking P0/P1 (excluding skipped live probes).`
      : `**FAIL** — resolve P0 then P1 before Phase 12 sign-off.`,
    ``,
    `## Pages`,
    ``,
    `| System | Page | Href | Status | Notes |`,
    `| --- | --- | --- | --- | --- |`,
  ];

  for (const p of pages) {
    lines.push(
      `| ${p.system} | ${p.label} | \`${p.href}\` | ${p.status} | ${p.notes.join("; ") || "—"} |`
    );
  }

  lines.push(``, `## Findings`, ``);
  if (!sorted.length) {
    lines.push(`No findings.`);
  } else {
    for (const f of sorted) {
      lines.push(`### [${f.severity}] ${f.title}`);
      lines.push(``);
      lines.push(`- Category: ${f.category}`);
      if (f.path) lines.push(`- Path: \`${f.path}\``);
      lines.push(`- ${f.detail}`);
      lines.push(``);
    }
  }

  lines.push(`## Principles`, ``);
  for (const p of AI_OS_PRINCIPLES) {
    lines.push(`- **${p.label}:** ${p.rule}`);
  }
  lines.push(``, `## Definition of Done`, ``);
  for (const d of AI_DEFINITION_OF_DONE) {
    lines.push(`- ${d}`);
  }
  lines.push(``);

  return lines.join("\n");
}

async function main() {
  await runLiveProbes();

  // Deduplicate findings by id
  const unique = new Map<string, Finding>();
  for (const f of findings) unique.set(f.id, f);
  findings.length = 0;
  findings.push(...unique.values());

  mkdirSync(OUT_DIR, { recursive: true });
  const md = renderMarkdown();
  const byStatus = {
    working: pages.filter((p) => p.status === "working").length,
    partial: pages.filter((p) => p.status === "partial").length,
    broken: pages.filter((p) => p.status === "broken").length,
  };
  const p0 = findings.filter((f) => f.severity === "P0");
  const p1 = findings.filter((f) => f.severity === "P1");
  const p1Blocking = p1.filter((f) => f.id !== "live-probes-skipped");
  const gate = p0.length === 0 && p1Blocking.length === 0 ? "PASS" : "FAIL";
  const json = {
    generatedAt: new Date().toISOString(),
    gate,
    summary: {
      pages: OS_PAGES.length,
      working: byStatus.working,
      partial: byStatus.partial,
      broken: byStatus.broken,
      findingsP0: p0.length,
      findingsP1: p1.length,
      findingsTotal: findings.length,
      adminApisMissingAuth: adminApiWithoutRequireAdmin.length,
      liveProbes: liveResults.length
        ? `${liveResults.filter((r) => r.ok).length}/${liveResults.length} ok`
        : "skipped",
      gate,
    },
    pages,
    findings,
    liveResults,
    inventory: {
      osPages: OS_PAGES.length,
      adminApiRoutes: adminApiRoutes.length,
      metricOwners: ownerIds.length,
      aiTasks: taskCount,
    },
  };

  writeFileSync(join(OUT_DIR, "admin-os-latest.md"), md);
  writeFileSync(join(OUT_DIR, "admin-os-latest.json"), JSON.stringify(json, null, 2));

  console.log(md);
  console.log(`\nWrote ${rel(join(OUT_DIR, "admin-os-latest.md"))}`);

  const blocking = findings.filter(
    (f) =>
      (f.severity === "P0" || f.severity === "P1") &&
      f.id !== "live-probes-skipped"
  );
  if (blocking.length > 0) {
    console.error(`\nAudit gate FAIL: ${blocking.length} P0/P1 findings`);
    process.exitCode = 1;
  } else {
    console.log(`\nAudit gate PASS`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
