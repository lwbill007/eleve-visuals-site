import { prisma } from "./db";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const LIMITS: Record<string, number> = {
  "submit:booking": 5,
  "submit:contact": 5,
  "submit:session": 5,
  "submit:session-upload": 30,
  "auth:login": 10,
  "analytics:pageview": 120,
};

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export async function checkRateLimit(
  ip: string,
  route: string
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
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

  await prisma.rateLimitEntry.create({ data: { ip, route } });
  return { ok: true };
}
