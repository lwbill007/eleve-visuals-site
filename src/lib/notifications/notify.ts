import { prisma } from "@/lib/db";
import { getNotificationSettings, getSiteConfig } from "@/lib/content";
import type { NotificationChannel, NotificationFormType } from "@/lib/types";
import {
  getEmailProvider,
  getPushProvider,
  getSmsProvider,
  getWebhookProvider,
  type DeliveryResult,
  type PushTarget,
  type WebhookField,
} from "./providers";

const DEDUPE_WINDOW_MS = 60 * 1000;
const PREVIEW_DISPLAY_LENGTH = 160;

const FORM_BADGE_COLORS: Record<string, string> = {
  contact: "#3b82f6",
  booking: "#b8a88a",
  session: "#8b5cf6",
  test: "#6b7280",
};

function adminBaseUrl(siteUrl: string): string {
  return (siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

export function buildAdminSubmissionUrl(
  formType: string,
  submissionId: string | undefined,
  siteUrl: string
): string {
  const base = adminBaseUrl(siteUrl);
  if (!submissionId) return `${base}/admin/submissions`;
  if (formType === "session") {
    return `${base}/admin/applications?focus=${submissionId}`;
  }
  const type = formType === "booking" ? "booking" : "contact";
  return `${base}/admin/submissions?type=${type}&focus=${submissionId}`;
}

const FORM_LABELS: Record<string, string> = {
  contact: "Contact inquiry",
  booking: "Booking",
  session: "ÉLEVÉ Sessions application",
  test: "Test notification",
};

const FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  cityState: "City & state",
  serviceTypes: "Services",
  sessionSetting: "Session setting",
  preferredDate: "Preferred date",
  flexibleDate: "Flexible date",
  budgetRange: "Budget range",
  projectVision: "Project vision",
  pinterestLink: "Pinterest",
  moodBoardUrl: "Mood board",
  inspirationInstagram: "Instagram inspiration",
  driveLink: "Drive link",
  referralSource: "How they found us",
  portfolioWebsite: "Portfolio / website",
  portfolioLink: "Portfolio URL",
  demoReel: "Demo reel",
  sessionVolumeTitle: "Session volume",
  termsAccepted: "Accepted booking terms",
};

const HIDDEN_FIELDS = new Set([
  "sessionVolumeId",
  "sessionVolumeSlug",
  "agreementCurated",
  "agreementNoGuarantee",
  "agreementGuidelines",
  "agreementAccurate",
  "availabilityConfirm",
  "transportationConfirm",
  "creativeDirectionConfirm",
]);

function formLabel(formType: string): string {
  return FORM_LABELS[formType] || "Form submission";
}

function shortId(id?: string | null): string {
  return id ? id.slice(0, 8).toUpperCase() : "";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function humanizeKey(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return value.join(", ");
    }
    return value
      .map((v) => {
        if (v && typeof v === "object") {
          const record = v as Record<string, unknown>;
          if ("question" in record && "answer" in record) {
            return `${asString(record.question)}: ${asString(record.answer)}`;
          }
          return Object.values(record).map((x) => asString(x)).filter(Boolean).join(" — ");
        }
        return String(v);
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      .join(", ");
  }
  return String(value);
}

export function extractContact(data: Record<string, unknown>): {
  name: string;
  email: string;
  phone: string;
} {
  return {
    name: asString(data.fullName) || asString(data.name),
    email: asString(data.email),
    phone: asString(data.phone),
  };
}

function collectAttachments(data: Record<string, unknown>): {
  images: string[];
  docs: string[];
} {
  const urls: string[] = [];
  for (const value of Object.values(data)) {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) {
      urls.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && /^https?:\/\//i.test(item)) urls.push(item);
      }
    }
  }
  const images = [...new Set(urls.filter((u) => /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(u)))];
  const docs = [
    ...new Set(urls.filter((u) => /\.(pdf|docx?|pptx?|xlsx?|zip|csv|txt)(\?|$)/i.test(u))),
  ];
  return { images: images.slice(0, 8), docs: docs.slice(0, 10) };
}

function buildAttachmentsHtml(data: Record<string, unknown>): string {
  const { images, docs } = collectAttachments(data);
  if (images.length === 0 && docs.length === 0) return "";

  const thumbs = images
    .map(
      (url) =>
        `<a href="${escapeHtml(url)}" style="display:inline-block;margin:0 6px 6px 0;">
          <img src="${escapeHtml(
            url
          )}" alt="attachment" width="96" height="96" style="width:96px;height:96px;object-fit:cover;border-radius:6px;border:1px solid #e2e2e2;" />
        </a>`
    )
    .join("");

  const docLinks = docs
    .map((url) => {
      let name = url;
      try {
        name = decodeURIComponent(new URL(url).pathname.split("/").pop() || url);
      } catch {
        /* keep raw */
      }
      return `<li><a href="${escapeHtml(url)}" style="color:#1a1a1a;">${escapeHtml(name)}</a></li>`;
    })
    .join("");

  return `
    <h3 style="margin:20px 0 8px;font-size:14px;">Attachments</h3>
    ${thumbs ? `<div style="margin:0 0 8px;">${thumbs}</div>` : ""}
    ${docLinks ? `<ul style="margin:0;padding-left:18px;font-size:13px;">${docLinks}</ul>` : ""}`;
}

export function buildSubmissionFields(data: Record<string, unknown>): WebhookField[] {
  return Object.entries(data)
    .filter(([key, value]) => {
      if (HIDDEN_FIELDS.has(key)) return false;
      return formatValue(value).trim().length > 0;
    })
    .map(([key, value]) => ({ name: humanizeKey(key), value: formatValue(value) }));
}

function buildEmailHtml(
  formType: string,
  data: Record<string, unknown>,
  submissionId: string | undefined,
  adminUrl: string
): string {
  const label = formLabel(formType);
  const badgeColor = FORM_BADGE_COLORS[formType] || "#6b7280";
  const submittedAt = new Date().toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const rows = buildSubmissionFields(data)
    .map((field) => {
      const name = escapeHtml(field.name);
      const formatted = escapeHtml(field.value).replace(/\n/g, "<br />");
      return `<tr>
        <td style="padding:8px 12px;border:1px solid #e2e2e2;font-weight:600;vertical-align:top;width:35%;background:#fafafa;">${name}</td>
        <td style="padding:8px 12px;border:1px solid #e2e2e2;vertical-align:top;">${formatted}</td>
      </tr>`;
    })
    .join("");

  const badge = `<span style="display:inline-block;background:${badgeColor};color:#fff;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:5px 12px;border-radius:999px;">${escapeHtml(
    label
  )}</span>`;

  const cta = adminUrl
    ? `<p style="margin:20px 0 0;">
        <a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 20px;border-radius:6px;">Open submission in admin →</a>
      </p>`
    : "";

  return `
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;">
    <div style="margin:0 0 12px;">${badge}</div>
    <h2 style="margin:0 0 4px;font-size:20px;">New ${escapeHtml(label)}</h2>
    <p style="margin:0 0 16px;color:#666;font-size:13px;">${escapeHtml(submittedAt)}${
      submissionId ? ` · Submission ID: <strong>${escapeHtml(shortId(submissionId))}</strong>` : ""
    }</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <tbody>${rows}</tbody>
    </table>
    ${buildAttachmentsHtml(data)}
    ${cta}
    <p style="margin:20px 0 0;color:#999;font-size:12px;">Sent automatically by ÉLEVÉ Visuals.</p>
  </div>`;
}

function buildSmsText(
  formType: string,
  name: string,
  submissionId?: string
): string {
  const ref = submissionId ? ` (#${shortId(submissionId)})` : "";
  switch (formType) {
    case "booking":
      return `New Booking submitted${name ? ` by ${name}` : ""}.${ref}`;
    case "session":
      return `New ÉLEVÉ Sessions application received${name ? ` from ${name}` : ""}.${ref}`;
    case "contact":
      return `New Contact inquiry received${name ? ` from ${name}` : ""}.${ref}`;
    default:
      return `New form submission received.${ref}`;
  }
}

interface LogInput {
  submissionId?: string | null;
  formType: string;
  channel: NotificationChannel;
  provider: string;
  recipient: string;
  subject: string;
  preview: string;
  status: "sent" | "failed" | "skipped";
  error: string;
  attempts: number;
  dedupeKey: string;
}

async function writeLog(input: LogInput): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        submissionId: input.submissionId ?? null,
        formType: input.formType,
        channel: input.channel,
        provider: input.provider,
        recipient: input.recipient,
        subject: input.subject,
        preview: input.preview,
        status: input.status,
        error: input.error,
        attempts: input.attempts,
        dedupeKey: input.dedupeKey,
      },
    });
  } catch (error) {
    console.error("[notifications] failed to write log:", error);
  }
}

async function isDuplicate(dedupeKey: string): Promise<boolean> {
  if (!dedupeKey) return false;
  const recent = await prisma.notificationLog.findFirst({
    where: {
      dedupeKey,
      status: "sent",
      createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
    },
    select: { id: true },
  });
  return !!recent;
}

interface ChannelResult {
  status: "sent" | "failed" | "skipped";
  error?: string;
}

async function runChannel(args: {
  channel: NotificationChannel;
  formType: string;
  submissionId?: string;
  recipient: string;
  subject: string;
  preview: string;
  dedupeKey: string;
  send: () => Promise<DeliveryResult>;
  autoRetries?: number;
  escalateOnFail?: boolean;
}): Promise<ChannelResult> {
  if (!args.recipient) {
    await writeLog({
      submissionId: args.submissionId,
      formType: args.formType,
      channel: args.channel,
      provider: "",
      recipient: "",
      subject: args.subject,
      preview: args.preview,
      status: "failed",
      error: `No ${args.channel} recipient configured`,
      attempts: 0,
      dedupeKey: args.dedupeKey,
    });
    return { status: "failed", error: `No ${args.channel} recipient configured` };
  }

  if (await isDuplicate(args.dedupeKey)) {
    return { status: "skipped" };
  }

  const maxAttempts = 1 + Math.max(0, args.autoRetries ?? 0);
  let result: DeliveryResult = { ok: false, provider: "", error: "Not attempted" };
  let attempts = 0;
  for (let i = 0; i < maxAttempts; i += 1) {
    attempts += 1;
    result = await args.send();
    if (result.ok) break;
  }

  await writeLog({
    submissionId: args.submissionId,
    formType: args.formType,
    channel: args.channel,
    provider: result.provider,
    recipient: args.recipient,
    subject: args.subject,
    preview: args.preview,
    status: result.ok ? "sent" : "failed",
    error: result.error ?? "",
    attempts,
    dedupeKey: args.dedupeKey,
  });

  if (!result.ok && args.escalateOnFail) {
    await escalateSystemFailure(
      `${args.channel.toUpperCase()} delivery failed after ${attempts} attempt(s): ${
        result.error ?? "unknown error"
      }`
    );
  }

  return { status: result.ok ? "sent" : "failed", error: result.error };
}

const ESCALATION_DEDUPE_MS = 60 * 60 * 1000;

/**
 * Last-resort alert when a primary channel keeps failing — notifies the admin
 * via push and SMS that the notification system itself needs attention.
 * Throttled to once per hour to avoid alert storms.
 */
async function escalateSystemFailure(reason: string): Promise<void> {
  try {
    const recent = await prisma.notificationLog.findFirst({
      where: {
        formType: "system",
        createdAt: { gte: new Date(Date.now() - ESCALATION_DEDUPE_MS) },
      },
      select: { id: true },
    });
    if (recent) return;

    const settings = await getNotificationSettings();
    const message = `ÉLEVÉ alert: notification system failure. ${reason}`.slice(0, 300);

    // Push alert to all subscribed admin devices.
    const targets = await loadPushTargets();
    if (targets.length > 0) {
      const results = await getPushProvider().send(
        { title: "⚠️ Notification system failure", body: message },
        targets
      );
      await pruneGoneSubscriptions(results.filter((r) => r.gone).map((r) => r.endpoint));
      await writeLog({
        formType: "system",
        channel: "push",
        provider: getPushProvider().name,
        recipient: `${results.length} device(s)`,
        subject: "System failure alert",
        preview: message,
        status: results.some((r) => r.ok) ? "sent" : "failed",
        error: results.some((r) => r.ok) ? "" : "Escalation push failed",
        attempts: 1,
        dedupeKey: "",
      });
    }

    // SMS alert if configured.
    if (settings.smsPhone.trim()) {
      const result = await getSmsProvider().send({
        to: settings.smsPhone.trim(),
        body: message,
      });
      await writeLog({
        formType: "system",
        channel: "sms",
        provider: result.provider,
        recipient: settings.smsPhone.trim(),
        subject: "System failure alert",
        preview: message,
        status: result.ok ? "sent" : "failed",
        error: result.error ?? "",
        attempts: 1,
        dedupeKey: "",
      });
    }
  } catch (error) {
    console.error("[notifications] escalation failed:", error);
  }
}

async function loadPushTargets(): Promise<PushTarget[]> {
  const subs = await prisma.pushSubscription.findMany();
  return subs.map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }));
}

async function pruneGoneSubscriptions(endpoints: string[]): Promise<void> {
  if (endpoints.length === 0) return;
  await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: endpoints } } });
}

export interface NewSubmissionInput {
  formType: NotificationFormType;
  submissionId?: string;
  data: Record<string, unknown>;
}

/**
 * Central entry point: fan out admin notifications across every enabled channel
 * (email, SMS, browser push, webhooks) for any successful form submission.
 * Safe to call without blocking — failures are logged per channel, never thrown.
 */
export async function notifyNewSubmission(input: NewSubmissionInput): Promise<void> {
  try {
    const [settings, siteConfig] = await Promise.all([
      getNotificationSettings(),
      getSiteConfig(),
    ]);

    const contact = extractContact(input.data);
    const label = formLabel(input.formType);
    const subject = `New ${label}${contact.name ? ` — ${contact.name}` : ""}`;
    const smsBody = buildSmsText(input.formType, contact.name, input.submissionId);
    const adminUrl = buildAdminSubmissionUrl(input.formType, input.submissionId, siteConfig.url);
    const dedupeBase = `${input.formType}:${contact.email || contact.phone || input.submissionId || ""}`;

    const tasks: Promise<ChannelResult>[] = [];

    if (settings.emailEnabled) {
      const recipients =
        settings.notificationEmails.length > 0
          ? settings.notificationEmails
          : siteConfig.email
            ? [siteConfig.email]
            : [];
      const html = buildEmailHtml(input.formType, input.data, input.submissionId, adminUrl);
      tasks.push(
        runChannel({
          channel: "email",
          formType: input.formType,
          submissionId: input.submissionId,
          recipient: recipients.join(", "),
          subject,
          preview: html,
          dedupeKey: `${dedupeBase}:email`,
          autoRetries: 1,
          escalateOnFail: true,
          send: () =>
            getEmailProvider().send({
              to: recipients,
              subject,
              html,
              replyTo: contact.email || undefined,
            }),
        })
      );
    }

    if (settings.smsEnabled) {
      const recipient = settings.smsPhone.trim();
      tasks.push(
        runChannel({
          channel: "sms",
          formType: input.formType,
          submissionId: input.submissionId,
          recipient,
          subject: smsBody,
          preview: smsBody,
          dedupeKey: `${dedupeBase}:sms`,
          send: () => getSmsProvider().send({ to: recipient, body: smsBody }),
        })
      );
    }

    if (settings.pushEnabled) {
      tasks.push(
        (async (): Promise<ChannelResult> => {
          const targets = await loadPushTargets();
          if (targets.length === 0) {
            return { status: "skipped" };
          }
          if (await isDuplicate(`${dedupeBase}:push`)) {
            return { status: "skipped" };
          }
          const results = await getPushProvider().send(
            { title: subject, body: smsBody, url: adminUrl, silent: !settings.pushSound },
            targets
          );
          await pruneGoneSubscriptions(
            results.filter((r) => r.gone).map((r) => r.endpoint)
          );
          const sent = results.filter((r) => r.ok).length;
          const failed = results.length - sent;
          const firstError = results.find((r) => !r.ok && !r.gone)?.error;
          await writeLog({
            submissionId: input.submissionId,
            formType: input.formType,
            channel: "push",
            provider: getPushProvider().name,
            recipient: `${results.length} device(s)`,
            subject,
            preview: smsBody,
            status: sent > 0 ? "sent" : "failed",
            error: sent > 0 ? "" : firstError || "All push deliveries failed",
            attempts: 1,
            dedupeKey: `${dedupeBase}:push`,
          });
          return {
            status: sent > 0 ? "sent" : "failed",
            error: failed > 0 ? firstError : undefined,
          };
        })()
      );
    }

    if (settings.webhookEnabled) {
      const content = {
        formType: input.formType,
        title: `New ${label}`,
        summary: `${contact.name || contact.email || "A visitor"} submitted the ${label.toLowerCase()}${
          input.submissionId ? ` (#${shortId(input.submissionId)})` : ""
        }.`,
        fields: buildSubmissionFields(input.data),
        url: adminUrl,
        timestamp: new Date().toISOString(),
      };
      for (const webhook of settings.webhooks.filter((w) => w.enabled && w.url)) {
        let host = webhook.url;
        try {
          host = new URL(webhook.url).host;
        } catch {
          /* keep raw */
        }
        tasks.push(
          runChannel({
            channel: "webhook",
            formType: input.formType,
            submissionId: input.submissionId,
            recipient: `${webhook.type}: ${host}`,
            subject: content.title,
            preview: content.summary,
            dedupeKey: `${dedupeBase}:webhook:${webhook.url}`,
            send: () => getWebhookProvider().send(webhook, content),
          })
        );
      }
    }

    await Promise.allSettled(tasks);
  } catch (error) {
    console.error("[notifications] notifyNewSubmission failed:", error);
  }
}

/**
 * Optional friendly confirmation email to the visitor after a successful submission.
 * Best-effort; not logged in the admin notification history.
 */
export async function sendVisitorConfirmation(args: {
  formType: NotificationFormType;
  to: string;
  name: string;
}): Promise<void> {
  try {
    const settings = await getNotificationSettings();
    if (!settings.sendApplicantConfirmation) return;
    if (!args.to) return;

    const siteConfig = await getSiteConfig();
    const label = formLabel(args.formType).toLowerCase();
    const html = `
      <div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <p>Hi ${escapeHtml(args.name || "there")},</p>
        <p>Thank you for reaching out to ÉLEVÉ Visuals. We've received your ${escapeHtml(label)} and will get back to you personally${
          siteConfig.responseTime ? ` ${escapeHtml(siteConfig.responseTime.toLowerCase())}` : " soon"
        }.</p>
        <p>— ÉLEVÉ Visuals</p>
      </div>`;

    await getEmailProvider().send({
      to: args.to,
      subject: "We received your message — ÉLEVÉ Visuals",
      html,
      replyTo: siteConfig.email,
    });
  } catch (error) {
    console.error("[notifications] sendVisitorConfirmation failed:", error);
  }
}

export async function sendTestNotification(
  channel: NotificationChannel
): Promise<ChannelResult> {
  const [settings, siteConfig] = await Promise.all([
    getNotificationSettings(),
    getSiteConfig(),
  ]);

  if (channel === "email") {
    const recipients =
      settings.notificationEmails.length > 0
        ? settings.notificationEmails
        : siteConfig.email
          ? [siteConfig.email]
          : [];
    const subject = "Test notification — ÉLEVÉ Visuals";
    const html = `
      <div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <h2 style="margin:0 0 8px;">Email notifications are working</h2>
        <p style="color:#666;">${escapeHtml(new Date().toLocaleString())}</p>
        <p>This is a test from your ÉLEVÉ Visuals notification settings.</p>
      </div>`;
    return runChannel({
      channel: "email",
      formType: "test",
      recipient: recipients.join(", "),
      subject,
      preview: html,
      dedupeKey: "",
      send: () => getEmailProvider().send({ to: recipients, subject, html }),
    });
  }

  if (channel === "sms") {
    const recipient = settings.smsPhone.trim();
    const body = "ÉLEVÉ Visuals: SMS notifications are working.";
    return runChannel({
      channel: "sms",
      formType: "test",
      recipient,
      subject: body,
      preview: body,
      dedupeKey: "",
      send: () => getSmsProvider().send({ to: recipient, body }),
    });
  }

  if (channel === "push") {
    const targets = await loadPushTargets();
    if (targets.length === 0) {
      return { status: "failed", error: "No devices are subscribed to push." };
    }
    const results = await getPushProvider().send(
      {
        title: "Test notification — ÉLEVÉ Visuals",
        body: "Browser push notifications are working.",
        url: adminBaseUrl(siteConfig.url) + "/admin/notifications",
      },
      targets
    );
    await pruneGoneSubscriptions(results.filter((r) => r.gone).map((r) => r.endpoint));
    const sent = results.filter((r) => r.ok).length;
    await writeLog({
      formType: "test",
      channel: "push",
      provider: getPushProvider().name,
      recipient: `${results.length} device(s)`,
      subject: "Test push",
      preview: "Browser push notifications are working.",
      status: sent > 0 ? "sent" : "failed",
      error: sent > 0 ? "" : results.find((r) => !r.ok)?.error || "Push failed",
      attempts: 1,
      dedupeKey: "",
    });
    return {
      status: sent > 0 ? "sent" : "failed",
      error: sent > 0 ? undefined : "Push delivery failed",
    };
  }

  // webhook
  const webhooks = settings.webhooks.filter((w) => w.enabled && w.url);
  if (webhooks.length === 0) {
    return { status: "failed", error: "No webhooks are configured." };
  }
  const content = {
    formType: "test",
    title: "Test notification — ÉLEVÉ Visuals",
    summary: "This is a test from your ÉLEVÉ Visuals notification settings.",
    fields: [{ name: "Status", value: "Webhook integration is working" }],
    url: adminBaseUrl(siteConfig.url) + "/admin/notifications",
    timestamp: new Date().toISOString(),
  };
  const results = await Promise.all(
    webhooks.map(async (webhook) => {
      let host = webhook.url;
      try {
        host = new URL(webhook.url).host;
      } catch {
        /* keep raw */
      }
      return runChannel({
        channel: "webhook",
        formType: "test",
        recipient: `${webhook.type}: ${host}`,
        subject: content.title,
        preview: content.summary,
        dedupeKey: "",
        send: () => getWebhookProvider().send(webhook, content),
      });
    })
  );
  const anyOk = results.some((r) => r.status === "sent");
  return {
    status: anyOk ? "sent" : "failed",
    error: anyOk ? undefined : results.find((r) => r.error)?.error,
  };
}

export async function retryNotification(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const row = await prisma.notificationLog.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "Notification not found" };

  let result: DeliveryResult;
  if (row.channel === "email") {
    const recipients = row.recipient
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    result = await getEmailProvider().send({
      to: recipients.length ? recipients : row.recipient,
      subject: row.subject,
      html: row.preview,
    });
  } else if (row.channel === "sms") {
    result = await getSmsProvider().send({ to: row.recipient, body: row.preview });
  } else if (row.channel === "push") {
    const targets = await loadPushTargets();
    if (targets.length === 0) {
      return { ok: false, error: "No devices are subscribed to push." };
    }
    const results = await getPushProvider().send(
      { title: row.subject, body: row.preview },
      targets
    );
    await pruneGoneSubscriptions(results.filter((r) => r.gone).map((r) => r.endpoint));
    const ok = results.some((r) => r.ok);
    result = {
      ok,
      provider: getPushProvider().name,
      error: ok ? undefined : results.find((r) => !r.ok)?.error,
    };
  } else {
    return {
      ok: false,
      error: "Retry is only supported for email and SMS. Re-send webhooks from the source tool.",
    };
  }

  await prisma.notificationLog.update({
    where: { id },
    data: {
      status: result.ok ? "sent" : "failed",
      error: result.error ?? "",
      provider: result.provider,
      attempts: row.attempts + 1,
    },
  });

  return { ok: result.ok, error: result.error };
}

export function truncatePreview(preview: string): string {
  const text = preview.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > PREVIEW_DISPLAY_LENGTH
    ? `${text.slice(0, PREVIEW_DISPLAY_LENGTH)}…`
    : text;
}
