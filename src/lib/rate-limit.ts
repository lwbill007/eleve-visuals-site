import { prisma } from "./db";
import { Prisma } from "@prisma/client";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const TRANSACTION_MAX_WAIT_MS = 10_000;
const TRANSACTION_TIMEOUT_MS = 10_000;

/**
 * Safe to retry: a serialization conflict (P2034) or a transaction that could
 * not start in time, e.g. while the database wakes from idle (P2028).
 * Anything else still fails closed.
 */
export function isRetryableRateLimitError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2034" || error.code === "P2028")
  );
}

const LIMITS: Record<string, number> = {
  // Successful booking inquiries — raised so testing/retries don't lock you out
  "submit:booking": 20,
  "submit:contact": 15,
  "submit:session": 15,
  "submit:session-upload": 40,
  "auth:login": 10,
  "analytics:pageview": 120,
  "contract:sign": 10,
  "booking:deposit-session": 10,
  // High-cost / mutating admin AI (per IP / hour)
  "admin-ai:generate": 60,
  "admin-ai:chat": 90,
  "admin-ai:execute": 40,
  "admin-ai:reports": 30,
  "admin-ai:automations": 20,
  "admin-ai:memory-write": 60,
  "admin-ai:embeddings": 10,
  "admin-ai:cognitive": 40,
  "admin-ai:sessions-rank": 20,
  "admin-ai:notifications": 60,
  // Client galleries. The code bucket is deliberately tight: an 8-character
  // code from a 31-character alphabet is strong, but only if guessing is slow.
  "gallery:code": 8,
  // A wedding gallery is routinely 400+ photographs and a client saving them
  // one at a time is the normal case, not abuse. 60/hour meant a paying client
  // hit "Too many downloads" partway through their own delivery.
  "gallery:download": 800,
  // Signing a display URL when the lightbox opens. One per photo viewed.
  "gallery:asset": 1200,
  "gallery:archive": 6,
  "gallery:favorite": 300,
  "gallery:comment": 60,
  "gallery:upload-url": 400,
};

/**
 * This site is proxied through Cloudflare, which always overwrites `CF-Connecting-IP` at its
 * edge with the real client IP — it can't be spoofed by a direct request the way
 * `X-Forwarded-For` can (XFF is client-suppliable and only trustworthy if every hop in front
 * of the app enforces append-only semantics, which isn't guaranteed here). Prefer it; fall back
 * to XFF/`X-Real-IP` only for local dev or if Cloudflare is ever removed from the request path.
 */
export function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim() || "unknown";
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
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          // Neon scales to zero; the first query after idle can take several
          // seconds. Prisma's 2s default made logins fail while it woke up.
          maxWait: TRANSACTION_MAX_WAIT_MS,
          timeout: TRANSACTION_TIMEOUT_MS,
        }
      );
    } catch (error) {
      if (attempt < 2 && isRetryableRateLimitError(error)) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
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
