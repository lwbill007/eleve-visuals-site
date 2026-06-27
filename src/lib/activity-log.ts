import { prisma } from "./db";
import { getClientIp } from "./rate-limit";

export interface ActivityLogInput {
  action: string;
  target?: string;
  details?: string;
  actor?: string;
  request?: Request;
}

/**
 * Records an admin action for the activity audit trail. Best-effort: never
 * throws so it can't break the underlying admin operation.
 */
export async function logActivity(input: ActivityLogInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        actor: input.actor ?? "admin",
        action: input.action,
        target: (input.target ?? "").slice(0, 300),
        details: (input.details ?? "").slice(0, 2000),
        ip: input.request ? getClientIp(input.request) : "",
      },
    });
  } catch (error) {
    console.error("[activity-log] failed to record activity:", error);
  }
}
