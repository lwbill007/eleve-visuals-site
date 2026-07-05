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

  return url;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: { db: { url: resolveDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
