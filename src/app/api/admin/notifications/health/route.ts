import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNotificationSettings } from "@/lib/content";
import { getEmailProvider, getPushProvider, getSmsProvider } from "@/lib/notifications";

type HealthStatus = "ok" | "warn" | "error" | "idle";

interface HealthComponent {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getNotificationSettings();
  const components: HealthComponent[] = [];

  // Database
  try {
    await prisma.submission.count();
    components.push({ key: "database", label: "Database", status: "ok", detail: "Connected" });
  } catch {
    components.push({
      key: "database",
      label: "Database",
      status: "error",
      detail: "Connection failed",
    });
  }

  // Email — misconfigured credentials are warn (not outage); DB alone can be error
  const email = getEmailProvider();
  const emailConfigured = email.isConfigured();
  let emailDetail = "Disabled";
  if (settings.emailEnabled) {
    if (emailConfigured) {
      emailDetail = `Ready (${email.name})`;
    } else {
      const missing = [
        !process.env.RESEND_API_KEY ? "RESEND_API_KEY" : null,
        !(process.env.EMAIL_FROM || process.env.SITE_EMAIL) ? "EMAIL_FROM" : null,
      ].filter(Boolean);
      emailDetail = `Not configured — missing ${missing.join(" + ") || "credentials"}`;
    }
  }
  components.push({
    key: "email",
    label: "Email",
    status: !settings.emailEnabled ? "idle" : emailConfigured ? "ok" : "warn",
    detail: emailDetail,
  });

  // SMS
  const sms = getSmsProvider();
  const smsConfigured = sms.isConfigured();
  components.push({
    key: "sms",
    label: "SMS",
    status: !settings.smsEnabled ? "idle" : smsConfigured ? "ok" : "warn",
    detail: !settings.smsEnabled
      ? "Disabled"
      : smsConfigured
        ? `Ready (${sms.name})`
        : "Not configured — missing credentials",
  });

  // Push
  const push = getPushProvider();
  const pushConfigured = push.isConfigured();
  const pushDevices = await prisma.pushSubscription.count();
  components.push({
    key: "push",
    label: "Push",
    status: !settings.pushEnabled
      ? "idle"
      : !pushConfigured
        ? "warn"
        : pushDevices === 0
          ? "warn"
          : "ok",
    detail: !settings.pushEnabled
      ? "Disabled"
      : !pushConfigured
        ? "Not configured — missing VAPID keys"
        : `${pushDevices} device(s)`,
  });

  // Webhooks
  const activeWebhooks = settings.webhooks.filter((w) => w.enabled && w.url).length;
  components.push({
    key: "webhooks",
    label: "Webhooks",
    status: !settings.webhookEnabled ? "idle" : activeWebhooks > 0 ? "ok" : "warn",
    detail: !settings.webhookEnabled
      ? "Disabled"
      : activeWebhooks > 0
        ? `${activeWebhooks} active`
        : "None configured",
  });

  // Cron / digest
  if (settings.digestFrequency === "off") {
    components.push({
      key: "cron",
      label: "Digest cron",
      status: "idle",
      detail: "Digest disabled",
    });
  } else {
    const stateRow = await prisma.siteContent.findUnique({
      where: { key: "notification-digest-state" },
    });
    let lastSentAt: Date | null = null;
    if (stateRow) {
      try {
        const parsed = JSON.parse(stateRow.value) as { lastSentAt?: string };
        lastSentAt = parsed.lastSentAt ? new Date(parsed.lastSentAt) : null;
      } catch {
        lastSentAt = null;
      }
    }
    const maxAgeMs =
      settings.digestFrequency === "weekly"
        ? 8 * 24 * 60 * 60 * 1000
        : 2 * 24 * 60 * 60 * 1000;
    const fresh = lastSentAt ? Date.now() - lastSentAt.getTime() < maxAgeMs : false;
    components.push({
      key: "cron",
      label: "Digest cron",
      status: lastSentAt ? (fresh ? "ok" : "warn") : "warn",
      detail: lastSentAt
        ? `Last run ${lastSentAt.toISOString().slice(0, 16).replace("T", " ")} UTC`
        : "Not run yet",
    });
  }

  const overall: HealthStatus = components.some((c) => c.status === "error")
    ? "error"
    : components.some((c) => c.status === "warn")
      ? "warn"
      : "ok";

  return NextResponse.json({ overall, components });
}
