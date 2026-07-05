import { prisma } from "@/lib/db";

export async function logAIAction(action: string, target: string, details: string) {
  try {
    await prisma.activityLog.create({
      data: { actor: "ai", action, target, details: details.slice(0, 2000) },
    });
  } catch {
    /* non-blocking */
  }
}
