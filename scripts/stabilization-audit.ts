/**
 * Platform stabilization audit — evidence for production engineering report.
 * Run: npx tsx scripts/stabilization-audit.ts
 */

import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname ?? __dirname, "..");
const SRC = join(ROOT, "src");

function walk(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory() && name !== "node_modules") out.push(...walk(p, ext));
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}

function grepInFiles(files: string[], pattern: RegExp): { file: string; count: number }[] {
  return files
    .map((file) => {
      const content = readFileSync(file, "utf8");
      const matches = content.match(pattern);
      return { file: file.replace(ROOT + "/", ""), count: matches?.length ?? 0 };
    })
    .filter((r) => r.count > 0);
}

const tsFiles = walk(SRC, ".ts").concat(walk(SRC, ".tsx"));
const apiRoutes = tsFiles.filter((f) => f.includes("/app/api/") && f.endsWith("/route.ts"));
const adminPages = tsFiles.filter((f) => f.includes("/app/admin/") && f.endsWith("/page.tsx"));

const scaffolds = grepInFiles(adminPages, /AdminModuleScaffold|Coming to ÉLEVÉ/);
const deadCandidates = [
  "src/components/admin/ai/MemoryCenterClient.tsx",
  "src/components/admin/ai/ExecutiveIntelligenceSuite.tsx",
].filter((f) => existsSync(join(ROOT, f)));

const unusedImports = deadCandidates.filter((f) => {
  const base = f.split("/").pop()!.replace(".tsx", "");
  const refs = execSync(`rg -l "${base}" src --glob '!${f}' 2>/dev/null || true`, { cwd: ROOT, encoding: "utf8" });
  return refs.trim().length === 0;
});

let tscOk = true;
try {
  execSync("npx tsc --noEmit", { cwd: ROOT, stdio: "pipe" });
} catch {
  tscOk = false;
}

const report = {
  generatedAt: new Date().toISOString(),
  counts: {
    apiRoutes: apiRoutes.length,
    adminPages: adminPages.length,
    tsFiles: tsFiles.length,
    scaffoldPages: scaffolds.length,
    deadComponentCandidates: deadCandidates.length,
    confirmedUnusedComponents: unusedImports.length,
  },
  scaffoldPages: scaffolds.map((s) => s.file),
  unusedComponents: unusedImports,
  getOperatorMetricsCallSites: grepInFiles(tsFiles, /getOperatorMetrics\(\)/g).length,
  resolveMetricsCallSites: grepInFiles(tsFiles, /resolveMetrics\(/g).length,
  emitBusinessEventCallSites: grepInFiles(tsFiles, /emitBusinessEvent\(/g).length,
  typecheckPass: tscOk,
  phases: {
    truthLayer: {
      resolverExists: existsSync(join(ROOT, "src/lib/ai/platform/truth-resolver.ts")),
      apiExists: existsSync(join(ROOT, "src/app/api/admin/ai/truth/metrics/route.ts")),
      dashboardWired: readFileSync(join(ROOT, "src/components/admin/AdminDashboard.tsx"), "utf8").includes("TruthMetricCard"),
      enforcement: "partial — 40+ modules still call getOperatorMetrics() directly",
    },
    graph: {
      eventGraphLinker: existsSync(join(ROOT, "src/lib/ai/platform/event-graph.ts")),
      businessEventTypes: 19,
    },
    verification: {
      engine: existsSync(join(ROOT, "src/lib/ai/platform/verification-engine.ts")),
      recommendationGate: readFileSync(join(ROOT, "src/lib/ai/memory/retrieval.ts"), "utf8").includes("forRecommendations"),
    },
  },
  productionReadinessScore: null as number | null,
  note: "Run against live DB + deployed URL for full QA. This script is static analysis only.",
};

console.log(JSON.stringify(report, null, 2));
