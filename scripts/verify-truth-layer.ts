/**
 * Truth Layer enforcement guard.
 *
 * Constitutional rule: no UI-layer file may compute business metrics
 * independently. The presentation layer (components + app pages) must consume
 * the Truth Layer — `/api/admin/ai/truth/metrics` or `resolveMetrics()` — so
 * every displayed number carries provenance (source, table, confidence, label).
 *
 * This script FAILS (exit 1) if a forbidden raw-metric source leaks into the
 * UI layer. It also reports lib-layer direct callers as informational tech debt
 * (does not fail the build — those are the intelligence layer, migrated over time).
 *
 * Run: npx tsx scripts/verify-truth-layer.ts
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname ?? __dirname, "..");
const SRC = join(ROOT, "src");

/** Raw metric sources the UI layer must never touch directly. */
const FORBIDDEN_IN_UI = [
  /from\s+["']@\/lib\/ai\/intelligence\/business-operator["']/,
  /\bgetOperatorMetrics\s*\(/,
];

/** UI layer = anything a browser renders. API routes are a separate (allowed) data tier. */
function isUiLayer(file: string): boolean {
  const rel = relative(SRC, file);
  if (rel.startsWith("components/")) return true;
  if (rel.startsWith("app/") && !rel.includes("/api/")) return true;
  return false;
}

/** Files explicitly allowed to reference raw metrics (the Truth Layer itself + sanctioned APIs). */
const ALLOWLIST = new Set(
  [
    "lib/ai/platform/truth-resolver.ts",
    "app/api/admin/ai/truth/metrics/route.ts",
    "app/api/admin/ai/operator/route.ts",
    "app/api/admin/os/dashboard/route.ts",
  ].map((p) => join(SRC, p))
);

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
const uiViolations: { file: string; pattern: string }[] = [];
const libCallers: string[] = [];

for (const file of files) {
  if (ALLOWLIST.has(file)) continue;
  const content = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);

  if (isUiLayer(file)) {
    for (const rx of FORBIDDEN_IN_UI) {
      if (rx.test(content)) uiViolations.push({ file: rel, pattern: rx.source });
    }
  } else if (/\bgetOperatorMetrics\s*\(/.test(content)) {
    libCallers.push(rel);
  }
}

console.log("── Truth Layer Enforcement ──────────────────────────────");
console.log(`Scanned: ${files.length} TS/TSX files`);
console.log(`UI-layer violations (FAIL): ${uiViolations.length}`);
console.log(`Lib-layer direct callers (tech debt, non-blocking): ${libCallers.length}`);

if (libCallers.length > 0) {
  console.log("\nInformational — intelligence modules still using raw getOperatorMetrics():");
  for (const c of libCallers.sort()) console.log(`  • ${c}`);
}

if (uiViolations.length > 0) {
  console.error("\n❌ Truth Layer bypass detected in UI layer:");
  for (const v of uiViolations) {
    console.error(`  • ${v.file}  (matched /${v.pattern}/)`);
  }
  console.error("\nUI must consume /api/admin/ai/truth/metrics or resolveMetrics(). See scripts/verify-truth-layer.ts.");
  process.exit(1);
}

console.log("\n✅ No Truth Layer bypass in UI layer.");
