import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * Pure access-code and digest helpers.
 *
 * Deliberately free of `server-only`, cookies and Prisma so this logic is
 * directly testable — the same split the codebase already uses for
 * booking-pipeline.ts and payments.ts. Anything that touches a request or the
 * database lives in access.ts instead.
 */

/**
 * Unambiguous alphabet — no O/0, I/1/L. Codes get read off a phone screen and
 * typed by hand, and "was that an O or a zero" is a support email.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** 8 characters from a 31-character alphabet ≈ 2^39 combinations. */
export function generateAccessCode(): string {
  const bytes = randomBytes(8);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}

/** Case and dashes are cosmetic; the client should not fail on either. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function hashAccessCode(code: string): Promise<string> {
  return bcrypt.hash(normalizeCode(code), 10);
}

export async function verifyAccessCode(code: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(normalizeCode(code), hash);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** IPs are stored only as a salted digest — enough to spot abuse, not a log of who. */
export function hashIp(ip: string): string {
  if (!ip) return "";
  return createHash("sha256").update(`${ip}:gallery`).digest("hex").slice(0, 32);
}

export function isGalleryLive(gallery: { status: string; expiresAt: Date | null }): boolean {
  if (gallery.status !== "published") return false;
  if (gallery.expiresAt && gallery.expiresAt.getTime() <= Date.now()) return false;
  return true;
}
