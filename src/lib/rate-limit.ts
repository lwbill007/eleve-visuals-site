import { prisma } from "./db";
import { Prisma } from "@prisma/client";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const LIMITS: Record<string, number> = {
  // Successful booking inquiries — raised so testing/retries don't lock you out
  "submit:booking": 20,
  "submit:contact": 15,
  "submit:session": 15,
  "submit:session-upload": 40,
  "auth:login": 10,
  "analytics:pageview": 120,
  // High-cost / mutating admin AI (per IP / hour)
  "admin-ai:generate": 60,
  "admin-ai:chat": 90,
  "admin-ai:execute": 40,
  "admin-ai:reports": 30,
  "admin-ai:automations": 20,
  "admin-ai:memory-write": 60,
  "admin-ai:embeddings": 10,
  "admin-ai:cognitive": 40,
};

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * Check (and optionally consume) a rate-limit slot.
 * Use `consume: false` for form submits so validation failures don't burn quota;
 * then call `consumeRateLimit` after a successful write.
 */
export async function checkRateLimit(
  ip: string,
  route: string,
  opts: { consume?: boolean } = {}
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const consume = opts.consume !== false;
  const limit = LIMITS[route] ?? 10;
  const since = new Date(Date.now() - WINDOW_MS);

  void prisma.rateLimitEntry.deleteMany({ where: { createdAt: { lt: since } } }).catch(() => {});

  if (!consume) {
    const count = await prisma.rateLimitEntry.count({
      where: { ip, route, createdAt: { gte: since } },
    });
    return count >= limit
      ? { ok: false, retryAfterSec: Math.ceil(WINDOW_MS / 1000) }
      : { ok: true };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const count = await tx.rateLimitEntry.count({
            where: { ip, route, createdAt: { gte: since } },
          });
          if (count >= limit) {
            return { ok: false as const, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
          }
          await tx.rateLimitEntry.create({ data: { ip, route } });
          return { ok: true as const };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (
        attempt < 2 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        continue;
      }
      throw error;
    }
  }

  return { ok: false, retryAfterSec: 1 };
}

/** Record a successful attempt against the route quota. */
export async function consumeRateLimit(ip: string, route: string): Promise<void> {
  await prisma.rateLimitEntry.create({ data: { ip, route } });
}

/** Clear rate-limit entries (unlock after testing / false positives). */
export async function clearRateLimit(route?: string, ip?: string): Promise<number> {
  const result = await prisma.rateLimitEntry.deleteMany({
    where: {
      ...(route ? { route } : {}),
      ...(ip ? { ip } : {}),
    },
  });
  return result.count;
}
