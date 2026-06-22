import { prisma } from "./db";
import type { SessionApplicationSettings, SessionVolumeDTO } from "./types";
import { isApplicationsOpen } from "./session-volume";
import { parseApplicationSettings } from "./session-application";

export async function getSessionVolumeForApplication(volumeId: string) {
  return prisma.sessionVolume.findUnique({ where: { id: volumeId } });
}

export function isDeadlinePassed(deadline: Date | null | string | undefined): boolean {
  if (!deadline) return false;
  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  return d.getTime() < Date.now();
}

export async function countAcceptedApplications(volumeId: string): Promise<number> {
  return prisma.submission.count({
    where: {
      type: "session",
      sessionVolumeId: volumeId,
      status: { in: ["accepted", "confirmed"] },
    },
  });
}

export async function countSessionApplications(volumeId: string): Promise<number> {
  return prisma.submission.count({
    where: { type: "session", sessionVolumeId: volumeId },
  });
}

export async function hasDuplicateApplication(
  volumeId: string,
  email: string
): Promise<boolean> {
  const existing = await prisma.submission.findMany({
    where: { type: "session", sessionVolumeId: volumeId },
    select: { data: true },
    take: 500,
  });
  const normalized = email.trim().toLowerCase();
  return existing.some((row) => {
    try {
      const data = JSON.parse(row.data) as { email?: string };
      return data.email?.trim().toLowerCase() === normalized;
    } catch {
      return false;
    }
  });
}

export async function validateSessionApplicationGate(volume: {
  id: string;
  status: string;
  published: boolean;
  showApplyButton: boolean;
  applicationDeadline: Date | null;
  applicationSettings: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const settings = parseApplicationSettings(volume.applicationSettings);
  const dto = {
    status: volume.status,
    published: volume.published,
    showApplyButton: volume.showApplyButton,
  } as Pick<SessionVolumeDTO, "status" | "published" | "showApplyButton">;

  if (!isApplicationsOpen(dto)) {
    return { ok: false, message: "Applications are not currently open for this session." };
  }

  if (settings.autoCloseOnDeadline && isDeadlinePassed(volume.applicationDeadline)) {
    return { ok: false, message: "The application deadline has passed." };
  }

  if (settings.autoCloseOnCapacity && settings.maxCapacity != null) {
    const accepted = await countAcceptedApplications(volume.id);
    if (accepted >= settings.maxCapacity) {
      return {
        ok: false,
        message: settings.waitlistEnabled
          ? "This session has reached capacity. Waitlist may be available soon."
          : "This session has reached capacity and is no longer accepting applications.",
      };
    }
  }

  return { ok: true };
}

export async function maybeAutoCloseVolume(
  volumeId: string,
  settings: SessionApplicationSettings,
  deadline: Date | null
) {
  if (settings.autoCloseOnDeadline && isDeadlinePassed(deadline)) {
    await prisma.sessionVolume.update({
      where: { id: volumeId },
      data: { status: "applications_closed" },
    });
    return;
  }

  if (settings.autoCloseOnCapacity && settings.maxCapacity != null) {
    const accepted = await countAcceptedApplications(volumeId);
    if (accepted >= settings.maxCapacity) {
      await prisma.sessionVolume.update({
        where: { id: volumeId },
        data: { status: settings.waitlistEnabled ? "applications_closed" : "sold_out" },
      });
    }
  }
}
