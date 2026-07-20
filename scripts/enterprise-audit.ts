/**
 * Enterprise audit — static, evidence-only inventory of the platform.
 * Produces no fabricated runtime results; every number is derived from the
 * source tree. Run: npm run audit:enterprise
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname ?? __dirname, "..");
const SRC = join(ROOT, "src");

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

const files = walk(SRC);
const rel = (f: string) => relative(ROOT, f);
const read = (f: string) => readFileSync(f, "utf8");

const apiRoutes = files.filter((f) => f.includes("/app/api/") && f.endsWith("/route.ts"));
const adminApiRoutes = apiRoutes.filter((f) => f.includes("/api/admin/"));
const adminPages = files.filter((f) => f.includes("/app/admin/") && f.endsWith("/page.tsx"));
const clientPages = adminPages.filter((f) => read(f).includes('"use client"'));

// Admin API routes that do NOT self-check auth (they rely on middleware; flag for defense-in-depth).
const adminApiWithoutRequireAdmin = adminApiRoutes.filter((f) => {
  const c = read(f);
  return !c.includes("requireAdmin") && !c.includes("x-vercel-signature");
});

  // Client pages missing loading UX: route loading.tsx OR inline loading state.
  const pagesWithoutLoadingState = clientPages.filter((f) => {
    const c = read(f);
    if (/loading|Loading|isLoading|Skeleton|Suspense|WorkspaceLoading/.test(c)) return false;
    const dir = f.replace(/\/page\.tsx$/, "");
    try {
      return !statSync(join(dir, "loading.tsx")).isFile();
    } catch {
      return true;
    }
  });

// Executive Context adoption.
const execContextConsumers = files.filter((f) => read(f).includes("useExecutiveContext(")).map(rel);

// Truth Layer: UI bypass (should be 0) vs lib direct callers (tech debt).
const uiFiles = files.filter((f) => {
  const r = relative(SRC, f);
  return r.startsWith("components/") || (r.startsWith("app/") && !r.includes("/api/"));
});
const uiTruthBypass = uiFiles.filter(
  (f) => /\bgetOperatorMetrics\s*\(/.test(read(f)) || /business-operator/.test(read(f))
);
const libOperatorCallers = files.filter(
  (f) => !uiFiles.includes(f) && /\bgetOperatorMetrics\s*\(/.test(read(f))
).length;

// Business events wired.
const emitCallSites = files.filter((f) => /emitBusinessEvent\s*\(/.test(read(f)) && !f.endsWith("business-events.ts")).map(rel);

// Prisma models.
const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
const models = [...schema.matchAll(/^model\s+(\w+)/gm)].map((m) => m[1]);

const report = {
  generatedAt: new Date().toISOString(),
  inventory: {
    tsFiles: files.length,
    apiRoutes: apiRoutes.length,
    adminApiRoutes: adminApiRoutes.length,
    adminPages: adminPages.length,
    clientPages: clientPages.length,
    prismaModels: models.length,
  },
  prismaModels: models,
  security: {
    adminApiRoutesWithoutSelfAuthCheck: adminApiWithoutRequireAdmin.length,
    routesFlagged: adminApiWithoutRequireAdmin.map(rel),
    note: "Middleware enforces JWT on /api/admin/** globally; self-check is defense-in-depth only.",
  },
  truthLayer: {
    uiBypassViolations: uiTruthBypass.map(rel),
    libDirectCallers: libOperatorCallers,
    enforcementScript: "scripts/verify-truth-layer.ts (fails CI on UI bypass)",
  },
  executiveContext: {
    consumers: execContextConsumers,
    mountedGlobally: read(join(SRC, "components/admin/AdminShell.tsx")).includes("ExecutiveContextProvider"),
  },
  businessEvents: {
    emitCallSites,
    count: emitCallSites.length,
  },
  ux: {
    clientPagesMissingLoadingState: pagesWithoutLoadingState.map(rel).length,
    pages: pagesWithoutLoadingState.map(rel),
  },
  runtimeValidation: {
    status: "BLOCKED",
    reason: "No reachable DATABASE_URL locally (Postgres down, no Docker/psql, prod URL only in Vercel). next build + executive QA + perf benchmarks cannot run here.",
    unblockBy: "Run `npm run verify` and executive QA on Vercel or with a reachable DATABASE_URL.",
  },
};

console.log(JSON.stringify(report, null, 2));
