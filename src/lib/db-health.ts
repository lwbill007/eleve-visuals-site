import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

export type HealthStatus = "ok" | "warn" | "error" | "skip";

export interface HealthCheck {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
}

export interface DatabaseHealthReport {
  generatedAt: string;
  overall: HealthStatus;
  databaseUrl: {
    configured: boolean;
    provider: string;
    host: string;
    isNeon: boolean;
    isPooled: boolean;
    directUrlConfigured: boolean;
  };
  checks: HealthCheck[];
  migrations: {
    applied: number;
    pending: string[];
    latest: string | null;
  };
  tables: Array<{ name: string; exists: boolean; rowCount: number | null }>;
  conceptualMap: Array<{ concept: string; implementation: string; status: HealthStatus }>;
}

const PRISMA_TABLES = [
  "PortfolioItem",
  "Service",
  "Testimonial",
  "SiteContent",
  "Submission",
  "ActivityLog",
  "MediaAsset",
  "NotificationLog",
  "PushSubscription",
  "RateLimitEntry",
  "AnalyticsEvent",
  "SessionVolume",
  "AIMemory",
  "AIMemoryRelation",
  "AILearningOutcome",
  "AIMemoryAudit",
  "AIConversation",
  "AIAutomation",
  "AINotification",
  "AICache",
  "CastMember",
] as const;

const CONCEPTUAL_MAP: Array<{ concept: string; implementation: string; table: string }> = [
  { concept: "users", implementation: "Env-based admin auth (ADMIN_PASSWORD + AUTH_SECRET)", table: "" },
  { concept: "bookings", implementation: "Submission rows where type = booking", table: "Submission" },
  { concept: "applications", implementation: "Submission rows where type = session", table: "Submission" },
  { concept: "submissions", implementation: "Submission", table: "Submission" },
  { concept: "contacts", implementation: "Submission rows where type = contact", table: "Submission" },
  { concept: "pipeline", implementation: "Derived kanban from Submission statuses", table: "Submission" },
  { concept: "sessions", implementation: "SessionVolume + CastMember", table: "SessionVolume" },
  { concept: "marketing", implementation: "AIMemory (brand/marketing layers) + AnalyticsEvent", table: "AIMemory" },
  { concept: "analytics", implementation: "AnalyticsEvent", table: "AnalyticsEvent" },
  { concept: "ai_memory", implementation: "AIMemory", table: "AIMemory" },
  { concept: "memory_layers", implementation: "AIMemory.layer column", table: "AIMemory" },
  { concept: "memory_sources", implementation: "AIMemory.source + sourceRef columns", table: "AIMemory" },
  { concept: "memory_events", implementation: "AIMemoryAudit", table: "AIMemoryAudit" },
  { concept: "notifications", implementation: "NotificationLog + AINotification", table: "NotificationLog" },
  { concept: "content", implementation: "SiteContent key/value store", table: "SiteContent" },
  { concept: "portfolio", implementation: "PortfolioItem", table: "PortfolioItem" },
  { concept: "sponsors", implementation: "SessionVolume.sponsors JSON field", table: "SessionVolume" },
  { concept: "finances", implementation: "Derived from pipeline/submissions (no dedicated table)", table: "Submission" },
  { concept: "automations", implementation: "AIAutomation", table: "AIAutomation" },
];

function parseDatabaseUrl(url: string | undefined) {
  if (!url?.trim()) {
    return { configured: false, provider: "", host: "", isNeon: false, isPooled: false };
  }
  const trimmed = url.trim();
  let host = "";
  try {
    host = new URL(trimmed.replace(/^postgres(ql)?:\/\//, "http://")).hostname;
  } catch {
    host = trimmed.match(/@([^/]+)/)?.[1]?.split(":")[0] ?? "unknown";
  }
  return {
    configured: true,
    provider: "postgresql",
    host,
    isNeon: trimmed.includes("neon.tech"),
    isPooled: trimmed.includes("-pooler") || trimmed.includes("pgbouncer=true"),
  };
}

async function getMigrationStatus(client: PrismaClient) {
  try {
    const applied = await client.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      ORDER BY finished_at DESC NULLS LAST
    `;
    const appliedNames = applied.map((r) => r.migration_name);
    const latest = appliedNames[0] ?? null;

    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const entries = await fs.readdir(migrationsDir);
    const localMigrations = entries
      .filter((e) => e !== "migration_lock.toml" && !e.startsWith("."))
      .sort();
    const pending = localMigrations.filter((m) => !appliedNames.includes(m));

    return { applied: appliedNames.length, pending, latest };
  } catch (err) {
    return {
      applied: 0,
      pending: [] as string[],
      latest: null as string | null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function tableExists(client: PrismaClient, table: string): Promise<boolean> {
  const result = await client.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${table}
    ) AS exists
  `;
  return result[0]?.exists ?? false;
}

async function getRowCount(client: PrismaClient, table: string): Promise<number | null> {
  try {
    const result = await client.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${table}"`
    );
    return Number(result[0]?.count ?? 0);
  } catch {
    return null;
  }
}

async function verifyIndexesAndForeignKeys(client: PrismaClient): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  try {
    const indexes = await client.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM pg_indexes
      WHERE schemaname = 'public'
    `;
    const indexCount = Number(indexes[0]?.count ?? 0);
    checks.push({
      key: "indexes",
      label: "Indexes",
      status: indexCount > 0 ? "ok" : "error",
      detail: `${indexCount} indexes in public schema`,
    });
  } catch (err) {
    checks.push({
      key: "indexes",
      label: "Indexes",
      status: "error",
      detail: err instanceof Error ? err.message : "Index check failed",
    });
  }

  try {
    const fks = await client.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY'
    `;
    const fkCount = Number(fks[0]?.count ?? 0);
    checks.push({
      key: "foreign_keys",
      label: "Foreign keys",
      status: fkCount >= 2 ? "ok" : "warn",
      detail: `${fkCount} foreign keys (CastMember→SessionVolume, AIMemoryRelation→AIMemory, etc.)`,
    });
  } catch (err) {
    checks.push({
      key: "foreign_keys",
      label: "Foreign keys",
      status: "error",
      detail: err instanceof Error ? err.message : "FK check failed",
    });
  }

  return checks;
}

async function runCrudSmokeTest(client: PrismaClient): Promise<HealthCheck> {
  const testKey = `__health_check_${Date.now()}`;
  try {
    await client.$transaction(async (tx) => {
      await tx.siteContent.create({ data: { key: testKey, value: "{}" } });
      const row = await tx.siteContent.findUnique({ where: { key: testKey } });
      if (!row) throw new Error("Read after create failed");
      await tx.siteContent.update({ where: { key: testKey }, data: { value: '{"ok":true}' } });
      await tx.siteContent.delete({ where: { key: testKey } });
    });
    return { key: "crud", label: "CRUD operations", status: "ok", detail: "Create, read, update, delete verified" };
  } catch (err) {
    return {
      key: "crud",
      label: "CRUD operations",
      status: "error",
      detail: err instanceof Error ? err.message : "CRUD smoke test failed",
    };
  }
}

async function verifyMemorySystem(client: PrismaClient): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  try {
    await client.aIMemory.count();
    checks.push({ key: "ai_memory", label: "AI memory", status: "ok", detail: "AIMemory accessible" });
  } catch (err) {
    checks.push({
      key: "ai_memory",
      label: "AI memory",
      status: "error",
      detail: err instanceof Error ? err.message : "AIMemory unavailable",
    });
  }

  for (const [key, label, fn] of [
    ["memory_graph", "Memory graph", () => client.aIMemoryRelation.count()],
    ["memory_learning", "Learning outcomes", () => client.aILearningOutcome.count()],
    ["memory_audit", "Memory audit trail", () => client.aIMemoryAudit.count()],
  ] as const) {
    try {
      await fn();
      checks.push({ key, label, status: "ok", detail: `${label} accessible` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      checks.push({
        key,
        label,
        status: msg.includes("does not exist") ? "warn" : "error",
        detail: msg.includes("does not exist")
          ? "Pending migration 20260705000000_ai_memory_intelligence"
          : msg,
      });
    }
  }

  return checks;
}

async function verifyAiTables(client: PrismaClient): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];
  const aiModels = [
    ["ai_conversations", "AI conversations", () => client.aIConversation.count()],
    ["ai_automations", "AI automations", () => client.aIAutomation.count()],
    ["ai_notifications", "AI notifications", () => client.aINotification.count()],
    ["ai_cache", "AI cache", () => client.aICache.count()],
  ] as const;

  for (const [key, label, fn] of aiModels) {
    try {
      const count = await fn();
      checks.push({ key, label, status: "ok", detail: `${label} accessible (${count} rows)` });
    } catch (err) {
      checks.push({
        key,
        label,
        status: "error",
        detail: err instanceof Error ? err.message : `${label} check failed`,
      });
    }
  }

  return checks;
}

export async function runDatabaseHealthCheck(client: PrismaClient = prisma): Promise<DatabaseHealthReport> {
  const checks: HealthCheck[] = [];
  const urlInfo = parseDatabaseUrl(process.env.DATABASE_URL);
  const directUrlConfigured = Boolean(process.env.DIRECT_URL?.trim());

  checks.push({
    key: "connection",
    label: "Database connection",
    status: "ok",
    detail: `Connected to ${urlInfo.host || "PostgreSQL"}`,
  });

  if (!urlInfo.configured) {
    checks[0] = { key: "connection", label: "Database connection", status: "error", detail: "DATABASE_URL missing" };
  } else if (!urlInfo.isNeon && process.env.NODE_ENV === "production") {
    checks.push({
      key: "neon",
      label: "Neon production",
      status: "warn",
      detail: `Host ${urlInfo.host} — verify this is your Neon production database`,
    });
  } else if (urlInfo.isNeon) {
    checks.push({
      key: "neon",
      label: "Neon production",
      status: "ok",
      detail: `Neon host: ${urlInfo.host}`,
    });
  }

  if (urlInfo.isPooled) {
    checks.push({
      key: "pooling",
      label: "Connection pooling",
      status: directUrlConfigured ? "ok" : "warn",
      detail: directUrlConfigured
        ? "Pooled DATABASE_URL + DIRECT_URL configured for migrations"
        : "Pooled URL detected — set DIRECT_URL for safe migrations",
    });
  } else if (urlInfo.configured) {
    checks.push({
      key: "pooling",
      label: "Connection pooling",
      status: "ok",
      detail: "Direct connection (no pooler detected)",
    });
  }

  try {
    await client.$queryRaw`SELECT 1`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    checks[0] = {
      key: "connection",
      label: "Database connection",
      status: "error",
      detail: msg,
    };
    return {
      generatedAt: new Date().toISOString(),
      overall: "error" as HealthStatus,
      databaseUrl: { ...urlInfo, directUrlConfigured },
      checks,
      migrations: { applied: 0, pending: [], latest: null },
      tables: PRISMA_TABLES.map((name) => ({ name, exists: false, rowCount: null })),
      conceptualMap: CONCEPTUAL_MAP.map(({ concept, implementation, table }) => ({
        concept,
        implementation,
        status: (table ? "error" : "skip") as HealthStatus,
      })),
    };
  }

  const migrationResult = await getMigrationStatus(client);
  if ("error" in migrationResult && migrationResult.error) {
    checks.push({
      key: "migrations",
      label: "Migrations",
      status: "error",
      detail: migrationResult.error,
    });
  } else {
    const pending = migrationResult.pending ?? [];
    checks.push({
      key: "migrations",
      label: "Migrations",
      status: pending.length === 0 ? "ok" : "warn",
      detail:
        pending.length === 0
          ? `${migrationResult.applied} applied, latest: ${migrationResult.latest ?? "none"}`
          : `${migrationResult.applied} applied, ${pending.length} pending: ${pending.join(", ")}`,
    });
  }

  const tables: DatabaseHealthReport["tables"] = [];
  for (const table of PRISMA_TABLES) {
    const exists = await tableExists(client, table);
    const rowCount = exists ? await getRowCount(client, table) : null;
    tables.push({ name: table, exists, rowCount });
    if (!exists) {
      checks.push({
        key: `table_${table}`,
        label: `Table ${table}`,
        status: "error",
        detail: "Missing — run prisma migrate deploy",
      });
    }
  }

  const existingTables = tables.filter((t) => t.exists).length;
  checks.push({
    key: "tables",
    label: "Schema tables",
    status: existingTables === PRISMA_TABLES.length ? "ok" : "warn",
    detail: `${existingTables}/${PRISMA_TABLES.length} Prisma tables present`,
  });

  checks.push(...(await verifyIndexesAndForeignKeys(client)));
  checks.push(await runCrudSmokeTest(client));
  checks.push(...(await verifyMemorySystem(client)));
  checks.push(...(await verifyAiTables(client)));

  const conceptualMap = CONCEPTUAL_MAP.map(({ concept, implementation, table }) => {
    if (!table) {
      return { concept, implementation, status: "ok" as HealthStatus };
    }
    const found = tables.find((t) => t.name === table);
    return {
      concept,
      implementation,
      status: (found?.exists ? "ok" : "error") as HealthStatus,
    };
  });

  const overall: HealthStatus = checks.some((c) => c.status === "error")
    ? "error"
    : checks.some((c) => c.status === "warn")
      ? "warn"
      : "ok";

  return {
    generatedAt: new Date().toISOString(),
    overall,
    databaseUrl: { ...urlInfo, directUrlConfigured },
    checks,
    migrations: {
      applied: migrationResult.applied ?? 0,
      pending: migrationResult.pending ?? [],
      latest: migrationResult.latest ?? null,
    },
    tables,
    conceptualMap,
  };
}
