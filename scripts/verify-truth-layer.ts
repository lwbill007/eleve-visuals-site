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
 * Also enforces two specific Metric Integrity drift patterns (see
 * src/lib/ai/platform/metric-definitions.ts) that TypeScript's structural typing
 * cannot catch on its own — a duplicated string literal or a newly-introduced field
 * name compiles fine even when it silently reintroduces a bug this codebase already
 * paid to fix once. Deliberately NOT attempting to lint every possible metric-drift
 * shape (e.g. an independently-computed "conversion rate," a mislabeled dashboard
 * card) — those failure modes don't have a low-false-positive mechanical signature;
 * they're caught by code review against metric-definitions.ts instead. A minimal set
 * of high-confidence checks beats a large, noisy one.
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

/**
 * The verified-settled-payment predicate, spelled out as a literal object instead of importing
 * `VERIFIED_SETTLED_PAYMENT_WHERE` (src/lib/payments.ts). Two copies of the same predicate can
 * drift silently — this exact shape (both fields adjacent, as a WHERE clause) was found
 * duplicated in resolve-command-kpis.ts (fixed) and src/app/api/admin/ai/timeline/route.ts
 * (fixed) during the Metric Integrity Layer hardening pass. Deliberately narrow (requires both
 * literals adjacent) so it doesn't flag unrelated "succeeded"/"verified" strings elsewhere
 * (e.g. TruthValue's own verificationStatus label, a manual-payment status enum).
 */
const DUPLICATED_PAYMENT_PREDICATE =
  /status\s*:\s*["']succeeded["']\s*,\s*verificationStatus\s*:\s*["']verified["']/;
const PAYMENT_PREDICATE_ALLOWLIST = new Set([join(SRC, "lib/payments.ts")]);

/**
 * `visitors30`/`visitors7`-style identifiers held a raw pageview count mislabeled as a deduped
 * visitor count — the core bug FIX-004 fixed across ~40 call sites. `pageviews30`/`pageviews7`
 * and `uniqueSessions` are the correct names; this pattern should never reappear in real code.
 * The two files below reference the old names only inside comments/docs explaining the fixed
 * bug by name, not as live identifiers — allowlisted for that reason.
 */
const STALE_VISITOR_FIELD = /\bvisitors\d+\b/;
const VISITOR_FIELD_ALLOWLIST = new Set(
  [
    "lib/ai/intelligence/business-operator.ts",
    "lib/ai/platform/metric-definitions.ts",
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
const driftViolations: { file: string; check: string }[] = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);

  if (!PAYMENT_PREDICATE_ALLOWLIST.has(file) && DUPLICATED_PAYMENT_PREDICATE.test(content)) {
    driftViolations.push({ file: rel, check: "duplicated verified-payment predicate" });
  }
  if (!VISITOR_FIELD_ALLOWLIST.has(file) && STALE_VISITOR_FIELD.test(content)) {
    driftViolations.push({ file: rel, check: "visitorsN-style field name (pageviews mislabeled as visitors)" });
  }

  if (ALLOWLIST.has(file)) continue;

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
console.log(`Metric-drift violations (FAIL): ${driftViolations.length}`);

if (libCallers.length > 0) {
  console.log("\nInformational — intelligence modules still using raw getOperatorMetrics():");
  for (const c of libCallers.sort()) console.log(`  • ${c}`);
}

if (driftViolations.length > 0) {
  console.error("\n❌ Metric Integrity drift detected:");
  for (const v of driftViolations) {
    console.error(`  • ${v.file}  (${v.check})`);
  }
  console.error("\nSee src/lib/ai/platform/metric-definitions.ts for the canonical source to use instead.");
  process.exit(1);
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
