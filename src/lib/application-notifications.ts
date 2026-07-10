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

/** Returns true if email sent, false if send failed/skipped, null if no email was attempted. */
export async function notifyApplicationStatusChange(
  submissionId: string,
  status: ApplicationStatus,
  previousStatus?: string
): Promise<boolean | null> {
  if (previousStatus === status) return null;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission || submission.type !== "session") return null;

  const volume = submission.sessionVolumeId
    ? await prisma.sessionVolume.findUnique({ where: { id: submission.sessionVolumeId } })
    : null;
  if (!volume) return null;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(submission.data) as Record<string, unknown>;
  } catch {
    return null;
  }

  const email = typeof data.email === "string" ? data.email.trim() : "";
  const name = typeof data.fullName === "string" ? data.fullName : "Applicant";
  if (!email) return null;

  const settings = parseApplicationSettings(volume.applicationSettings);
  const message = statusMessage(status, settings.emailTemplates);
  if (!message) return null;

  const siteConfig = await getSiteConfig();
  const mail = applicationStatusEmail({
    name,
    volumeTitle: volume.title,
    message,
  });

  return sendEmail({
    to: email,
    subject: mail.subject,
    html: mail.html,
    replyTo: siteConfig.email,
  });
}

export async function notifyBulkApplicationStatusChanges(
  ids: string[],
  status: ApplicationStatus,
  previousById?: Record<string, string>
) {
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const id of ids) {
    try {
      const result = await notifyApplicationStatusChange(id, status, previousById?.[id]);
      if (result === true) sent += 1;
      else if (result === false) failed += 1;
      else skipped += 1;
    } catch (error) {
      console.error("Application status email failed:", id, error);
      failed += 1;
    }
  }
  return { sent, failed, skipped };
}
