import { normalizeInquiryStatus } from "./booking-pipeline";

export const UNREACHED_BOOKING_EXPIRY_DAYS = 14;
export const BOOKING_OUTREACH_SCHEDULE_DAYS = [1, 3, 10] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export function bookingLeadExpiresAt(
  createdAt: Date | string,
  status: string
): Date | null {
  if (normalizeInquiryStatus(status) !== "lead") return null;
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  if (Number.isNaN(created.getTime())) return null;
  return new Date(created.getTime() + UNREACHED_BOOKING_EXPIRY_DAYS * DAY_MS);
}

export function bookingLeadDaysRemaining(
  createdAt: Date | string,
  status: string,
  now = new Date()
): number | null {
  const expiresAt = bookingLeadExpiresAt(createdAt, status);
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS));
}

export function bookingLeadExpiryCutoff(now = new Date()): Date {
  return new Date(now.getTime() - UNREACHED_BOOKING_EXPIRY_DAYS * DAY_MS);
}
