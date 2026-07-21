import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();

  if (!url) {
    throw new Error(
      "DATABASE_URL is missing. Set a PostgreSQL connection string in .env (see .env.example). " +
        "If you ran `vercel env pull`, remove empty DATABASE_URL=\"\" from .env.local — it overrides .env."
    );
  }

  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    throw new Error(
      `DATABASE_URL must use postgresql:// — this project migrated from SQLite to PostgreSQL. ` +
        `Current value starts with "${url.split(":")[0]}:". Update .env and restart the dev server.`
    );
  }

  const parsed = new URL(url);

  // Vercel functions must use Neon's pooled endpoint. A direct Neon endpoint
  // can time out while an idle compute wakes and can exhaust connections when
  // several serverless instances start together. DIRECT_URL remains the
  // direct connection used by Prisma migrations.
  if (
    process.env.NODE_ENV === "production" &&
    parsed.hostname.endsWith(".neon.tech") &&
    !parsed.hostname.includes("-pooler.")
  ) {
    const [endpoint, ...rest] = parsed.hostname.split(".");
    parsed.hostname = `${endpoint}-pooler.${rest.join(".")}`;
  }

  if (parsed.hostname.endsWith(".neon.tech")) {
    if (!parsed.searchParams.has("sslmode")) parsed.searchParams.set("sslmode", "require");
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", "15");
    }
    if (!parsed.searchParams.has("pool_timeout")) parsed.searchParams.set("pool_timeout", "15");
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "5");
    }
  }

  return parsed.toString();
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: { db: { url: resolveDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
