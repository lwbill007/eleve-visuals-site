import { prisma } from "@/lib/db";

export async function getCached<T>(key: string): Promise<T | null> {
  const row = await prisma.aICache.findUnique({ where: { key } });
  if (!row || row.expiresAt < new Date()) {
    if (row) await prisma.aICache.delete({ where: { key } }).catch(() => {});
    return null;
  }
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export async function setCache(key: string, payload: unknown, ttlMs: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs);
  await prisma.aICache.upsert({
    where: { key },
    create: { key, payload: JSON.stringify(payload), expiresAt },
    update: { payload: JSON.stringify(payload), expiresAt },
  });
}

export async function invalidateCache(prefix: string): Promise<void> {
  const rows = await prisma.aICache.findMany({
    where: { key: { startsWith: prefix } },
    select: { key: true },
  });
  await Promise.all(rows.map((r) => prisma.aICache.delete({ where: { key: r.key } })));
}
