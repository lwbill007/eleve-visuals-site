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

  // Email
  const email = getEmailProvider();
  components.push({
    key: "email",
    label: "Email",
    status: !settings.emailEnabled ? "idle" : email.isConfigured() ? "ok" : "error",
    detail: !settings.emailEnabled
      ? "Disabled"
      : email.isConfigured()
        ? `Ready (${email.name})`
        : "Missing API key",
  });

  // SMS
  const sms = getSmsProvider();
  components.push({
    key: "sms",
    label: "SMS",
    status: !settings.smsEnabled ? "idle" : sms.isConfigured() ? "ok" : "error",
    detail: !settings.smsEnabled
      ? "Disabled"
      : sms.isConfigured()
        ? `Ready (${sms.name})`
        : "Missing credentials",
  });

  // Push
  const push = getPushProvider();
  const pushDevices = await prisma.pushSubscription.count();
  components.push({
    key: "push",
    label: "Push",
    status: !settings.pushEnabled
      ? "idle"
      : !push.isConfigured()
        ? "error"
        : pushDevices === 0
          ? "warn"
          : "ok",
    detail: !settings.pushEnabled
      ? "Disabled"
      : !push.isConfigured()
        ? "Missing VAPID keys"
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
