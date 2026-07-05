#!/usr/bin/env npx tsx
/**
 * End-to-end Neon / Prisma database health check.
 * Usage: npm run db:health
 * Requires DATABASE_URL (and DIRECT_URL for pooled Neon) in .env
 */
import { PrismaClient } from "@prisma/client";
import { runDatabaseHealthCheck } from "../src/lib/db-health";

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("❌ DATABASE_URL is missing.");
    console.error("   Copy from Vercel → Project → Settings → Environment Variables");
    console.error("   Or run: docker compose up -d && use local URL from .env.example");
    process.exit(1);
  }
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    console.error(`❌ DATABASE_URL must use postgresql:// (got ${url.split(":")[0]}:)`);
    process.exit(1);
  }
  return url;
}

async function main() {
  const url = resolveDatabaseUrl();
  const host = url.match(/@([^/]+)/)?.[1] ?? "unknown";
  console.log(`\n🔍 ÉLEVÉ Database Health Check`);
  console.log(`   Host: ${host}`);
  console.log(`   Neon: ${url.includes("neon.tech") ? "yes" : "no"}`);
  console.log(`   Pooled: ${url.includes("-pooler") ? "yes" : "no"}`);
  console.log(`   DIRECT_URL: ${process.env.DIRECT_URL?.trim() ? "set" : "not set"}\n`);

  const client = new PrismaClient({
    datasources: { db: { url } },
    log: ["error"],
  });

  try {
    const report = await runDatabaseHealthCheck(client);

    for (const check of report.checks) {
      const icon = check.status === "ok" ? "✅" : check.status === "warn" ? "⚠️" : "❌";
      console.log(`${icon} ${check.label}: ${check.detail}`);
    }

    if (report.overall === "error" && report.checks[0]?.key === "connection") {
      console.log("\n💡 To connect to Neon production:");
      console.log("   1. Vercel → Project → Settings → Environment Variables");
      console.log("   2. Copy DATABASE_URL (pooled) and DIRECT_URL (direct) into .env");
      console.log("   3. Re-run: npm run db:health");
      console.log("\n   Or run production audit without local DB: npm run db:audit:production");
    } else {
    console.log("\n📋 Conceptual domain map:");
    for (const row of report.conceptualMap) {
      const icon = row.status === "ok" ? "✅" : row.status === "warn" ? "⚠️" : row.status === "skip" ? "⏭️" : "❌";
      console.log(`   ${icon} ${row.concept} → ${row.implementation}`);
    }

    console.log("\n📊 Summary:");
    console.log(`   Overall: ${report.overall.toUpperCase()}`);
    console.log(`   Migrations: ${report.migrations.applied} applied, ${report.migrations.pending.length} pending`);
    if (report.migrations.pending.length > 0) {
      console.log(`   Pending: ${report.migrations.pending.join(", ")}`);
      console.log("\n   Run: npx prisma migrate deploy");
    }

    const missing = report.tables.filter((t) => !t.exists);
    if (missing.length > 0) {
      console.log(`   Missing tables: ${missing.map((t) => t.name).join(", ")}`);
    }
    }

    process.exit(report.overall === "error" ? 1 : 0);
  } catch (err) {
    console.error("\n❌ Health check failed:");
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.$disconnect();
  }
}

main();
