#!/usr/bin/env npx tsx
/**
 * Expanded Executive Intelligence QA — production API probe suite
 */
const BASE = process.env.PRODUCTION_URL ?? "https://www.eleve-visuals.com";
const PASSWORD = process.env.ADMIN_PASSWORD ?? process.env.E2E_ADMIN_PASSWORD;

interface Probe {
  path: string;
  label: string;
  method?: "GET" | "POST";
  body?: unknown;
  expectStatus?: number;
  maxMs?: number;
}

const PROBES: Probe[] = [
  // Auth & DB
  { path: "/api/admin/notifications/health", label: "DB health (notifications)" },
  { path: "/api/admin/system/database-health", label: "Full database health" },
  // Dashboard & OS
  { path: "/api/admin/os/dashboard", label: "Executive dashboard" },
  { path: "/api/admin/stats", label: "Admin stats" },
  { path: "/api/admin/os/insights", label: "Insights" },
  { path: "/api/admin/os/pipeline", label: "Pipeline" },
  { path: "/api/admin/os/crm", label: "CRM OS" },
  { path: "/api/admin/analytics", label: "Analytics" },
  // Executive Intelligence
  { path: "/api/admin/ai/executive-os", label: "Executive OS" },
  { path: "/api/admin/ai/cognitive", label: "Cognitive architecture" },
  { path: "/api/admin/ai/intelligence-suite", label: "Intelligence suite" },
  { path: "/api/admin/ai/daily-briefing", label: "Daily briefing" },
  { path: "/api/admin/ai/briefing", label: "AI briefing" },
  { path: "/api/admin/ai/operator", label: "Business operator" },
  { path: "/api/admin/ai/weekly-report", label: "Weekly report" },
  { path: "/api/admin/ai/website-intelligence", label: "Website intelligence" },
  { path: "/api/admin/ai/bookings", label: "Booking intelligence" },
  // Knowledge Engine
  { path: "/api/admin/ai/memory", label: "Memory list" },
  { path: "/api/admin/ai/memory?view=stats", label: "Memory stats" },
  { path: "/api/admin/ai/memory/graph", label: "Knowledge graph" },
  { path: "/api/admin/ai/memory/learn-timeline", label: "Learning timeline" },
  { path: "/api/admin/ai/memory/automation", label: "Memory automation" },
  { path: "/api/admin/ai/embeddings/reindex", label: "Embeddings (GET only check)", method: "GET" },
  // Marketing & AI
  { path: "/api/admin/ai/marketing/intelligence", label: "Marketing intelligence" },
  { path: "/api/admin/ai/content-calendar", label: "Content calendar" },
  { path: "/api/admin/ai/automations", label: "Automations" },
  { path: "/api/admin/ai/notifications", label: "AI notifications" },
  { path: "/api/admin/ai/status", label: "AI provider status" },
  { path: "/api/admin/ai/reports", label: "BI reports" },
  // CRUD
  { path: "/api/admin/portfolio", label: "Portfolio" },
  { path: "/api/admin/services", label: "Services" },
  { path: "/api/admin/submissions", label: "Submissions" },
  { path: "/api/admin/session-volumes", label: "Session volumes" },
  { path: "/api/admin/testimonials", label: "Testimonials" },
  { path: "/api/admin/media", label: "Media library" },
];

async function login(): Promise<string> {
  if (!PASSWORD) {
    throw new Error("ADMIN_PASSWORD or E2E_ADMIN_PASSWORD is required");
  }
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: HTTP ${res.status}`);
  const match = (res.headers.get("set-cookie") ?? "").match(/eleve-admin-session=[^;]+/);
  if (!match) throw new Error("No session cookie");
  return match[0];
}

async function probe(cookie: string, p: Probe) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}${p.path}`, {
      method: p.method ?? "GET",
      headers: {
        Cookie: cookie,
        ...(p.body ? { "Content-Type": "application/json" } : {}),
      },
      body: p.body ? JSON.stringify(p.body) : undefined,
      signal: AbortSignal.timeout(p.maxMs ?? 30000),
    });
    const ms = Date.now() - start;
    let detail = `HTTP ${res.status} · ${ms}ms`;
    let data: Record<string, unknown> | null = null;
    if (res.ok) {
      try {
        data = await res.json();
        if (data?.overall) detail += ` · overall: ${data.overall}`;
        if (data?.generatedAt) detail += ` · ${String(data.generatedAt).slice(0, 19)}`;
        if (typeof data?.total === "number") detail += ` · ${data.total} items`;
        if (Array.isArray(data?.items)) detail += ` · ${data.items.length} items`;
        if (data?.systems) detail += ` · ${(data.systems as unknown[]).length} systems`;
        if (data?.checks) detail += ` · ${(data.checks as unknown[]).length} checks`;
        if (data?.operatingSystem) detail += ` · OS loaded`;
        if (data?.businessDna) detail += ` · DNA loaded`;
      } catch {
        /* */
      }
    } else {
      try {
        const err = await res.json();
        detail += ` · ${JSON.stringify(err).slice(0, 120)}`;
      } catch {
        /* */
      }
    }
    return { ...p, status: res.status, ok: res.status === (p.expectStatus ?? 200), ms, detail, data };
  } catch (err) {
    return {
      ...p,
      status: 0,
      ok: false,
      ms: Date.now() - start,
      detail: err instanceof Error ? err.message : "failed",
      data: null,
    };
  }
}

async function main() {
  console.log(`\n🔬 Executive Intelligence QA — ${BASE}\n`);
  const cookie = await login();
  console.log("✅ Authentication OK\n");

  const results = [];
  for (const p of PROBES) {
    const r = await probe(cookie, p);
    results.push(r);
    const icon = r.ok ? "✅" : r.status === 404 ? "⚠️" : r.status === 405 ? "⚠️" : "❌";
    console.log(`${icon} ${r.label}: ${r.detail}`);
  }

  // Public pages
  console.log("\n📄 Public pages:");
  for (const path of ["/", "/portfolio", "/book", "/sessions", "/sitemap.xml", "/robots.txt"]) {
    const t0 = Date.now();
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(15000) });
    console.log(`${res.ok ? "✅" : "❌"} ${path}: HTTP ${res.status} · ${Date.now() - t0}ms`);
  }

  // Unauthenticated should 401
  console.log("\n🔒 Security (unauthenticated):");
  const unauth = await fetch(`${BASE}/api/admin/ai/executive-os`);
  console.log(`${unauth.status === 401 ? "✅" : "❌"} executive-os without auth: HTTP ${unauth.status}`);

  const failed = results.filter((r) => !r.ok && r.status !== 404 && r.status !== 405);
  const slow = results.filter((r) => r.ms > 5000);
  const ok = results.filter((r) => r.ok).length;

  console.log(`\n📊 ${ok}/${results.length} APIs OK · ${failed.length} failed · ${slow.length} slow (>5s)`);

  // Write JSON report
  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    summary: { ok, total: results.length, failed: failed.length, slow: slow.length },
    results: results.map(({ label, path, status, ok, ms, detail }) => ({ label, path, status, ok, ms, detail })),
    failed: failed.map((r) => ({ label: r.path, detail: r.detail })),
    slow: slow.map((r) => ({ label: r.path, ms: r.ms })),
  };
  const fs = await import("node:fs/promises");
  await fs.writeFile("/tmp/eleve-qa-audit.json", JSON.stringify(report, null, 2));
  console.log("\nReport written to /tmp/eleve-qa-audit.json");

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
