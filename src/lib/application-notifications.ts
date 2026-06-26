import { prisma } from "./db";
import { sendEmail, applicationStatusEmail } from "./email";
import { getSiteConfig } from "./content";
import { parseApplicationSettings } from "./session-application";
import type { ApplicationStatus } from "./types";

function statusMessage(
  status: ApplicationStatus,
  templates: ReturnType<typeof parseApplicationSettings>["emailTemplates"]
): string | null {
  switch (status) {
    case "accepted":
      return templates.acceptance;
    case "waitlisted":
      return templates.waitlist;
    case "declined":
      return templates.rejection;
    case "shortlisted":
    case "interview":
      return templates.followUp;
    default:
      return null;
  }
}

export async function notifyApplicationStatusChange(
  submissionId: string,
  status: ApplicationStatus,
  previousStatus?: string
) {
  if (previousStatus === status) return;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission || submission.type !== "session") return;

  const volume = submission.sessionVolumeId
    ? await prisma.sessionVolume.findUnique({ where: { id: submission.sessionVolumeId } })
    : null;
  if (!volume) return;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(submission.data) as Record<string, unknown>;
  } catch {
    return;
  }

  const email = typeof data.email === "string" ? data.email.trim() : "";
  const name = typeof data.fullName === "string" ? data.fullName : "Applicant";
  if (!email) return;

  const settings = parseApplicationSettings(volume.applicationSettings);
  const message = statusMessage(status, settings.emailTemplates);
  if (!message) return;

  const siteConfig = await getSiteConfig();
  const mail = applicationStatusEmail({
    name,
    volumeTitle: volume.title,
    message,
  });

  await sendEmail({
    to: email,
    subject: mail.subject,
    html: mail.html,
    replyTo: siteConfig.email,
  });
}

export async function notifyBulkApplicationStatusChanges(
  ids: string[],
  status: ApplicationStatus
) {
  for (const id of ids) {
    try {
      await notifyApplicationStatusChange(id, status);
    } catch (error) {
      console.error("Application status email failed:", id, error);
    }
  }
}
