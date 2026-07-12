import { prisma } from "./db";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const LIMITS: Record<string, number> = {
  // Successful booking inquiries — raised so testing/retries don't lock you out
  "submit:booking": 20,
  "submit:contact": 15,
  "submit:session": 15,
  "submit:session-upload": 40,
  "auth:login": 10,
  "analytics:pageview": 120,
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

  const [count] = await Promise.all([
    prisma.rateLimitEntry.count({
      where: { ip, route, createdAt: { gte: since } },
    }),
    prisma.rateLimitEntry.deleteMany({ where: { createdAt: { lt: since } } }),
  ]);

  if (count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
  }

  if (consume) {
    await prisma.rateLimitEntry.create({ data: { ip, route } });
  }

  return { ok: true };
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
