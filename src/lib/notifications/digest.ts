import { prisma } from "@/lib/db";
import { getNotificationSettings, getSiteConfig } from "@/lib/content";
import { getEmailProvider } from "./providers";
import { buildAdminSubmissionUrl } from "./notify";

const DIGEST_STATE_KEY = "notification-digest-state";

interface DigestState {
  lastSentAt?: string;
}

const FORM_LABELS: Record<string, string> = {
  contact: "Contact inquiries",
  booking: "Bookings",
  session: "ÉLEVÉ Sessions applications",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function getDigestState(): Promise<DigestState> {
  const row = await prisma.siteContent.findUnique({ where: { key: DIGEST_STATE_KEY } });
  if (!row) return {};
  try {
    return JSON.parse(row.value) as DigestState;
  } catch {
    return {};
  }
}

async function setDigestState(state: DigestState): Promise<void> {
  await prisma.siteContent.upsert({
    where: { key: DIGEST_STATE_KEY },
    create: { key: DIGEST_STATE_KEY, value: JSON.stringify(state) },
    update: { value: JSON.stringify(state) },
  });
}

export interface DigestRunResult {
  ok: boolean;
  sent: boolean;
  reason?: string;
  count?: number;
}

/**
 * Builds and sends a periodic digest email summarizing submissions since the
 * last digest. Returns without sending if disabled, already sent within the
 * window, or there is nothing new. Instant notifications are unaffected.
 */
export async function runDigest(now: Date = new Date()): Promise<DigestRunResult> {
  const settings = await getNotificationSettings();

  if (settings.digestFrequency === "off") {
    return { ok: true, sent: false, reason: "Digest disabled" };
  }

  // Weekly digests only run on Mondays (UTC) even though the cron fires daily.
  if (settings.digestFrequency === "weekly" && now.getUTCDay() !== 1) {
    return { ok: true, sent: false, reason: "Not the weekly digest day" };
  }

  const windowMs =
    settings.digestFrequency === "weekly" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  const state = await getDigestState();
  const lastSentAt = state.lastSentAt ? new Date(state.lastSentAt) : null;

  // Avoid double-sending if the cron runs more than once in the window.
  if (lastSentAt && now.getTime() - lastSentAt.getTime() < windowMs - 60 * 60 * 1000) {
    return { ok: true, sent: false, reason: "Already sent within window" };
  }

  const since = new Date(now.getTime() - windowMs);

  const submissions = await prisma.submission.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });

  if (submissions.length === 0) {
    await setDigestState({ lastSentAt: now.toISOString() });
    return { ok: true, sent: false, reason: "No new submissions", count: 0 };
  }

  const siteConfig = await getSiteConfig();
  const grouped = new Map<string, typeof submissions>();
  for (const s of submissions) {
    const arr = grouped.get(s.type) ?? [];
    arr.push(s);
    grouped.set(s.type, arr);
  }

  const sections = Array.from(grouped.entries())
    .map(([type, rows]) => {
      const label = FORM_LABELS[type] || type;
      const items = rows
        .slice(0, 15)
        .map((row) => {
          let data: Record<string, unknown> = {};
          try {
            data = JSON.parse(row.data) as Record<string, unknown>;
          } catch {
            /* ignore */
          }
          const name =
            (typeof data.fullName === "string" && data.fullName) ||
            (typeof data.name === "string" && data.name) ||
            (typeof data.email === "string" && data.email) ||
            "Unknown";
          const url = buildAdminSubmissionUrl(type, row.id, siteConfig.url);
          const when = row.createdAt.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          });
          return `<li style="margin-bottom:6px;">
            <a href="${escapeHtml(url)}" style="color:#1a1a1a;font-weight:600;">${escapeHtml(
              String(name)
            )}</a>
            <span style="color:#888;font-size:12px;"> — ${escapeHtml(when)}</span>
          </li>`;
        })
        .join("");
      return `<h3 style="margin:20px 0 8px;font-size:16px;">${escapeHtml(label)} (${rows.length})</h3>
        <ul style="margin:0;padding-left:18px;font-size:14px;">${items}</ul>`;
    })
    .join("");

  const frequencyLabel = settings.digestFrequency === "weekly" ? "Weekly" : "Daily";
  const html = `
    <div style="font-family:Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;">
      <h2 style="margin:0 0 4px;">${frequencyLabel} submission digest</h2>
      <p style="color:#666;font-size:13px;margin:0 0 8px;">${escapeHtml(
        since.toLocaleString()
      )} – ${escapeHtml(now.toLocaleString())} · ${submissions.length} total</p>
      ${sections}
      <p style="margin:24px 0 0;color:#999;font-size:12px;">Sent automatically by ÉLEVÉ Visuals.</p>
    </div>`;

  const recipients =
    settings.digestEmails.length > 0
      ? settings.digestEmails
      : settings.notificationEmails.length > 0
        ? settings.notificationEmails
        : siteConfig.email
          ? [siteConfig.email]
          : [];

  if (recipients.length === 0) {
    return { ok: false, sent: false, reason: "No digest recipients configured" };
  }

  const result = await getEmailProvider().send({
    to: recipients,
    subject: `${frequencyLabel} digest — ${submissions.length} new submission${
      submissions.length === 1 ? "" : "s"
    }`,
    html,
  });

  await prisma.notificationLog.create({
    data: {
      formType: "digest",
      channel: "email",
      provider: result.provider,
      recipient: recipients.join(", "),
      subject: `${frequencyLabel} digest`,
      preview: `Digest with ${submissions.length} submissions`,
      status: result.ok ? "sent" : "failed",
      error: result.error ?? "",
      attempts: 1,
    },
  });

  if (result.ok) {
    await setDigestState({ lastSentAt: now.toISOString() });
  }

  return {
    ok: result.ok,
    sent: result.ok,
    reason: result.ok ? undefined : result.error,
    count: submissions.length,
  };
}
