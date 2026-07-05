#!/usr/bin/env npx tsx
/**
 * Production API audit — verifies Neon connectivity via live admin endpoints
 * without needing DATABASE_URL locally.
 *
 * Usage: npx tsx scripts/production-api-audit.ts
 * Env: PRODUCTION_URL (default https://www.eleve-visuals.com), ADMIN_PASSWORD
 */
const BASE = process.env.PRODUCTION_URL ?? "https://www.eleve-visuals.com";
const PASSWORD = process.env.ADMIN_PASSWORD ?? process.env.E2E_ADMIN_PASSWORD ?? "billyboy";

interface Probe {
  path: string;
  label: string;
  expectStatus?: number;
}

const PROBES: Probe[] = [
  { path: "/api/admin/notifications/health", label: "Database (notifications health)" },
  { path: "/api/admin/stats", label: "Dashboard stats" },
  { path: "/api/admin/portfolio", label: "Portfolio CRUD read" },
  { path: "/api/admin/submissions", label: "Submissions CRUD read" },
  { path: "/api/admin/session-volumes", label: "Sessions CRUD read" },
  { path: "/api/admin/services", label: "Services CRUD read" },
  { path: "/api/admin/testimonials", label: "Testimonials CRUD read" },
  { path: "/api/admin/ai/status", label: "AI provider status" },
  { path: "/api/admin/ai/automations", label: "AI automations" },
  { path: "/api/admin/ai/notifications", label: "AI notifications" },
  { path: "/api/admin/notifications/activity", label: "Notification activity" },
  { path: "/api/admin/ai/memory", label: "Memory Center API (may 404 if not deployed)" },
  { path: "/api/admin/system/database-health", label: "Full DB health (may 404 if not deployed)" },
];

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Login failed: HTTP ${res.status}`);
  }
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/eleve-admin-session=[^;]+/);
  if (!match) throw new Error("No eleve-admin-session cookie returned");
  return match[0];
}

async function probe(cookie: string, { path, label }: Probe) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Cookie: cookie },
      signal: AbortSignal.timeout(20000),
    });
    const status = res.status;
    let detail = `HTTP ${status}`;
    if (status === 200) {
      try {
        const json = await res.json();
        if (path.includes("health") && json.components) {
          const db = json.components.find((c: { key: string }) => c.key === "database");
          detail = db ? `Database: ${db.status} — ${db.detail}` : detail;
        } else if (Array.isArray(json.items)) {
          detail = `${json.items.length} items`;
        } else if (json.automations) {
          detail = `${json.automations.length} automations`;
        } else if (json.overall) {
          detail = `overall: ${json.overall}`;
        }
      } catch {
        /* non-json ok */
      }
    }
    return { label, path, status, ok: status === 200, detail };
  } catch (err) {
    return {
      label,
      path,
      status: 0,
      ok: false,
      detail: err instanceof Error ? err.message : "Request failed",
    };
  }
}

async function main() {
  console.log(`\n🌐 Production API Audit — ${BASE}\n`);

  let cookie: string;
  try {
    cookie = await login();
    console.log("✅ Admin authentication\n");
  } catch (err) {
    console.error(`❌ ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  const results = [];
  for (const p of PROBES) {
    const r = await probe(cookie, p);
    results.push(r);
    const icon = r.ok ? "✅" : r.status === 404 ? "⚠️" : "❌";
    console.log(`${icon} ${r.label}: ${r.detail}`);
  }

  const publicPages = ["/", "/portfolio", "/sessions", "/book", "/contact"];
  console.log("\n📄 Public pages (DB-backed SSR):");
  for (const path of publicPages) {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(15000) });
    console.log(`${res.ok ? "✅" : "❌"} ${path}: HTTP ${res.status}`);
  }

  const failed = results.filter((r) => !r.ok && r.status !== 404);
  const pending = results.filter((r) => r.status === 404);
  console.log(`\n📊 ${results.filter((r) => r.ok).length}/${results.length} admin APIs OK`);
  if (pending.length) console.log(`   ${pending.length} routes pending deploy (404)`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
