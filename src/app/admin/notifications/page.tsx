"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminField, AdminInput, SaveBar, StringListEditor } from "@/components/admin/AdminForm";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { TimeStamp } from "@/components/admin/TimeStamp";
import { useAdminToast } from "@/components/admin/AdminToast";
import { adminFetch } from "@/lib/admin-fetch";
import { saveAdminContent } from "@/lib/admin-save";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/lib/defaults";
import {
  getExistingSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-client";
import { useDirtyTracker, useUnsavedChangesWarning } from "@/hooks/useAdminEditor";
import type {
  DigestFrequency,
  NotificationLogDTO,
  NotificationSettings,
  WebhookConfig,
  WebhookType,
} from "@/lib/types";

interface ProviderStatus {
  email: { provider: string; configured: boolean };
  sms: { provider: string; configured: boolean };
  push: { provider: string; configured: boolean; devices: number };
}

interface Analytics {
  submissions: { today: number; week: number; month: number };
  delivery: { sent: number; failed: number; skipped: number; successRate: number; openFailures: number };
  avgResponseMs: number;
  respondedCount: number;
}

interface HealthComponent {
  key: string;
  label: string;
  status: "ok" | "warn" | "error" | "idle";
  detail: string;
}

interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  details: string;
  ip: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
  skipped: "bg-stone/30 text-fog",
  pending: "bg-amber-500/15 text-amber-300",
};

const FORM_TYPE_LABELS: Record<string, string> = {
  contact: "Contact",
  booking: "Booking",
  session: "Sessions",
  test: "Test",
  digest: "Digest",
  system: "System",
};

const FORM_BADGE: Record<string, string> = {
  booking: "border-[#b8a88a]/40 bg-[#b8a88a]/15 text-[#d8c8a8]",
  contact: "border-blue-500/30 bg-blue-500/15 text-blue-300",
  session: "border-purple-500/30 bg-purple-500/15 text-purple-300",
  system: "border-red-500/30 bg-red-500/15 text-red-300",
};

const HEALTH_DOT: Record<string, string> = {
  ok: "bg-emerald-400",
  warn: "bg-amber-400",
  error: "bg-red-400",
  idle: "bg-stone/50",
};

const WEBHOOK_TYPES: WebhookType[] = ["generic", "discord", "slack"];

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function playChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    /* ignore audio errors */
  }
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-4 rounded border border-stone/40 bg-charcoal/40 p-4 text-left transition-colors hover:border-stone/70"
    >
      <span>
        <span className="block text-sm text-cream">{label}</span>
        {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      </span>
      <span
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-stone/60"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-cream transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-stone/30 p-4">
      <p className="text-xs text-muted uppercase">{label}</p>
      <p className="mt-2 font-display text-3xl text-cream">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function AdminNotificationsPage() {
  const { toast } = useAdminToast();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS));
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [health, setHealth] = useState<{ overall: string; components: HealthComponent[] } | null>(
    null
  );
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [history, setHistory] = useState<NotificationLogDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [pushState, setPushState] = useState<"unsupported" | "subscribed" | "unsubscribed">(
    "unsubscribed"
  );
  const [pushBusy, setPushBusy] = useState(false);
  const prevUnread = useRef<number | null>(null);
  const soundEnabled = useRef(true);

  const dirty = useDirtyTracker(savedSnapshot, settings);
  useUnsavedChangesWarning(dirty);

  soundEnabled.current = settings.pushSound;

  const loadHistory = useCallback(async () => {
    const params = new URLSearchParams();
    if (showArchived) params.set("archived", "true");
    if (channelFilter) params.set("channel", channelFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (search.trim()) params.set("q", search.trim());
    const res = await adminFetch(`/api/admin/notifications/history?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as {
        history: NotificationLogDTO[];
        unreadCount: number;
      };
      if (
        prevUnread.current !== null &&
        data.unreadCount > prevUnread.current &&
        soundEnabled.current
      ) {
        playChime();
      }
      prevUnread.current = data.unreadCount;
      setHistory(data.history);
      setUnreadCount(data.unreadCount);
    }
  }, [showArchived, channelFilter, statusFilter, search]);

  const loadAnalytics = useCallback(async () => {
    const [a, h, act] = await Promise.all([
      adminFetch("/api/admin/notifications/analytics").then((r) => (r.ok ? r.json() : null)),
      adminFetch("/api/admin/notifications/health").then((r) => (r.ok ? r.json() : null)),
      adminFetch("/api/admin/notifications/activity").then((r) => (r.ok ? r.json() : null)),
    ]);
    if (a) setAnalytics(a);
    if (h) setHealth(h);
    if (act) setActivity(act.activity);
  }, []);

  useEffect(() => {
    void Promise.all([
      adminFetch("/api/admin/content?key=notificationSettings")
        .then((r) => r.json())
        .then((data: { value?: NotificationSettings }) => {
          if (data?.value) {
            const merged = { ...DEFAULT_NOTIFICATION_SETTINGS, ...data.value };
            setSettings(merged);
            setSavedSnapshot(JSON.stringify(merged));
          }
        })
        .catch(() => {}),
      adminFetch("/api/admin/notifications/status")
        .then((r) => r.json())
        .then((data: ProviderStatus) => setStatus(data))
        .catch(() => {}),
      loadAnalytics(),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAnalytics]);

  useEffect(() => {
    const timer = setTimeout(() => void loadHistory(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadHistory, search]);

  // Poll while the dashboard is open so unread counts and the chime stay live.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadHistory();
        void loadAnalytics();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [loadHistory, loadAnalytics]);

  useEffect(() => {
    if (!isPushSupported()) {
      setPushState("unsupported");
      return;
    }
    void getExistingSubscription().then((sub) =>
      setPushState(sub ? "subscribed" : "unsubscribed")
    );
  }, []);

  const persist = useCallback(async () => {
    setSaving(true);
    const ok = await saveAdminContent("notificationSettings", settings);
    if (ok) {
      setSavedSnapshot(JSON.stringify(settings));
      toast("Notification settings saved.");
      void loadAnalytics();
    }
    setMessage(ok ? "Saved." : "Save failed.");
    setSaving(false);
    return ok;
  }, [settings, toast, loadAnalytics]);

  async function sendTest(channel: "email" | "sms" | "push" | "webhook") {
    setTesting(channel);
    try {
      const res = await adminFetch("/api/admin/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) toast(`Test ${channel} sent.`);
      else toast(data.error || `Test ${channel} failed.`, "error");
      await loadHistory();
    } finally {
      setTesting(null);
    }
  }

  async function patchHistory(payload: Record<string, unknown>, id?: string) {
    if (id) setBusyRow(id);
    try {
      const res = await adminFetch("/api/admin/notifications/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await loadHistory();
        void loadAnalytics();
      }
    } finally {
      setBusyRow(null);
    }
  }

  async function retry(id: string) {
    setBusyRow(id);
    try {
      const res = await adminFetch("/api/admin/notifications/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) toast("Notification resent.");
      else toast(data.error || "Retry failed.", "error");
      await loadHistory();
      void loadAnalytics();
    } finally {
      setBusyRow(null);
    }
  }

  async function togglePush() {
    setPushBusy(true);
    try {
      if (pushState === "subscribed") {
        await unsubscribeFromPush();
        setPushState("unsubscribed");
        toast("This device will no longer receive push notifications.");
      } else {
        const result = await subscribeToPush();
        if (result.ok) {
          setPushState("subscribed");
          toast("Push notifications enabled on this device.");
        } else {
          toast(result.error || "Could not enable push.", "error");
        }
      }
      const statusRes = await adminFetch("/api/admin/notifications/status");
      if (statusRes.ok) setStatus(await statusRes.json());
    } finally {
      setPushBusy(false);
    }
  }

  function updateWebhook(index: number, patch: Partial<WebhookConfig>) {
    const webhooks = settings.webhooks.map((w, i) => (i === index ? { ...w, ...patch } : w));
    setSettings({ ...settings, webhooks });
  }

  if (loading) {
    return (
      <AdminShell title="Notifications">
        <AdminPageSkeleton />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Notifications">
      <p className="mb-6 max-w-2xl text-sm text-fog">
        Instant alerts for every form submission across email, SMS, push, and webhooks — with
        delivery tracking, analytics, and a full audit trail.
      </p>

      {analytics && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Submissions"
            value={String(analytics.submissions.today)}
            hint={`${analytics.submissions.week} this week · ${analytics.submissions.month} this month`}
          />
          <MetricCard
            label="Delivery success"
            value={`${analytics.delivery.successRate}%`}
            hint={`${analytics.delivery.sent} sent · ${analytics.delivery.skipped} skipped (30d)`}
          />
          <MetricCard
            label="Failed notifications"
            value={String(analytics.delivery.failed)}
            hint={`${analytics.delivery.openFailures} open / unarchived`}
          />
          <MetricCard
            label="Avg response time"
            value={formatDuration(analytics.avgResponseMs)}
            hint={`${analytics.respondedCount} responded (30d)`}
          />
        </div>
      )}

      {health && (
        <div className="mb-8 rounded border border-stone/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${HEALTH_DOT[health.overall]}`} />
            <h2 className="text-xs tracking-[0.2em] text-muted uppercase">System health</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {health.components.map((c) => (
              <div key={c.key} className="flex items-center gap-2 text-sm">
                <span className={`h-2 w-2 shrink-0 rounded-full ${HEALTH_DOT[c.status]}`} />
                <span className="text-cream">{c.label}</span>
                <span className="ml-auto text-xs text-muted">{c.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-xs tracking-[0.2em] text-muted uppercase">Channels</h2>

          <Toggle
            label="Email notifications"
            hint="Detailed email with all fields, attachments, a source badge, and a direct admin link. Auto-retries and escalates on failure."
            checked={settings.emailEnabled}
            onChange={(v) => setSettings({ ...settings, emailEnabled: v })}
          />
          {status && !status.email.configured && (
            <p className="rounded border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              Email provider ({status.email.provider}) is not configured. Set{" "}
              <code className="text-amber-100">RESEND_API_KEY</code> and{" "}
              <code className="text-amber-100">EMAIL_FROM</code>.
            </p>
          )}

          <Toggle
            label="SMS notifications"
            hint="Concise text message for each submission."
            checked={settings.smsEnabled}
            onChange={(v) => setSettings({ ...settings, smsEnabled: v })}
          />
          {status && !status.sms.configured && (
            <p className="rounded border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              SMS provider ({status.sms.provider}) is not configured. Set{" "}
              <code className="text-amber-100">TWILIO_ACCOUNT_SID</code>,{" "}
              <code className="text-amber-100">TWILIO_AUTH_TOKEN</code>, and{" "}
              <code className="text-amber-100">TWILIO_FROM_NUMBER</code>.
            </p>
          )}

          <Toggle
            label="Browser / mobile push notifications"
            hint="Instant push to subscribed admin devices."
            checked={settings.pushEnabled}
            onChange={(v) => setSettings({ ...settings, pushEnabled: v })}
          />
          {status && !status.push.configured && (
            <p className="rounded border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              Push is not configured. Set{" "}
              <code className="text-amber-100">VAPID_PUBLIC_KEY</code>,{" "}
              <code className="text-amber-100">VAPID_PRIVATE_KEY</code>, and{" "}
              <code className="text-amber-100">VAPID_SUBJECT</code>. Generate keys with{" "}
              <code className="text-amber-100">npx web-push generate-vapid-keys</code>.
            </p>
          )}
          <div className="flex flex-col gap-2 rounded border border-stone/40 bg-charcoal/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-cream">
              This device
              <span className="ml-2 text-xs text-muted">
                {pushState === "unsupported"
                  ? "Push not supported in this browser"
                  : pushState === "subscribed"
                    ? "Subscribed"
                    : "Not subscribed"}
                {status ? ` · ${status.push.devices} device(s) total` : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void togglePush()}
              disabled={pushBusy || pushState === "unsupported"}
              className="admin-touch-btn border border-stone/50 text-cream disabled:opacity-50"
            >
              {pushBusy
                ? "Working..."
                : pushState === "subscribed"
                  ? "Disable on this device"
                  : "Enable on this device"}
            </button>
          </div>
          <Toggle
            label="Notification sound"
            hint="Play a sound for push alerts and chime in this dashboard on new activity."
            checked={settings.pushSound}
            onChange={(v) => setSettings({ ...settings, pushSound: v })}
          />

          <Toggle
            label="Webhook integrations"
            hint="Send submissions to Discord, Slack, or any automation tool."
            checked={settings.webhookEnabled}
            onChange={(v) => setSettings({ ...settings, webhookEnabled: v })}
          />
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <StringListEditor
            label="Notification email addresses"
            items={settings.notificationEmails}
            onChange={(notificationEmails) => setSettings({ ...settings, notificationEmails })}
            addLabel="Add email recipient"
          />
          <AdminField
            label="SMS destination phone number"
            hint="Use E.164 format, e.g. +15551234567."
          >
            <AdminInput
              type="tel"
              value={settings.smsPhone}
              placeholder="+15551234567"
              onChange={(e) => setSettings({ ...settings, smsPhone: e.target.value })}
            />
          </AdminField>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs tracking-[0.2em] text-muted uppercase">Webhooks</h2>
          {settings.webhooks.length === 0 && (
            <p className="text-xs text-muted">
              No webhooks yet. Add a Discord or Slack incoming webhook URL, or a generic endpoint.
            </p>
          )}
          {settings.webhooks.map((webhook, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded border border-stone/40 bg-charcoal/30 p-3 sm:flex-row sm:items-center"
            >
              <select
                value={webhook.type}
                onChange={(e) => updateWebhook(index, { type: e.target.value as WebhookType })}
                className="border border-stone/50 bg-charcoal px-2 py-2 text-xs text-cream uppercase sm:w-32"
                aria-label="Webhook type"
              >
                {WEBHOOK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <AdminInput
                value={webhook.url}
                placeholder="https://discord.com/api/webhooks/..."
                onChange={(e) => updateWebhook(index, { url: e.target.value })}
                className="flex-1"
              />
              <label className="flex items-center gap-2 text-xs text-fog">
                <input
                  type="checkbox"
                  checked={webhook.enabled}
                  onChange={(e) => updateWebhook(index, { enabled: e.target.checked })}
                />
                Enabled
              </label>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    webhooks: settings.webhooks.filter((_, i) => i !== index),
                  })
                }
                className="text-xs text-red-400"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setSettings({
                ...settings,
                webhooks: [...settings.webhooks, { url: "", type: "discord", enabled: true }],
              })
            }
            className="text-xs text-accent"
          >
            Add webhook
          </button>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs tracking-[0.2em] text-muted uppercase">Digest</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <AdminField
              label="Digest frequency"
              hint="Summary email of submissions. Instant notifications still send."
            >
              <select
                value={settings.digestFrequency}
                onChange={(e) =>
                  setSettings({ ...settings, digestFrequency: e.target.value as DigestFrequency })
                }
                className="w-full border border-stone/50 bg-charcoal px-3 py-2.5 text-sm text-cream"
              >
                <option value="off">Off</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly (Mondays)</option>
              </select>
            </AdminField>
            <StringListEditor
              label="Digest recipients (optional)"
              items={settings.digestEmails}
              onChange={(digestEmails) => setSettings({ ...settings, digestEmails })}
              addLabel="Add digest recipient"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs tracking-[0.2em] text-muted uppercase">Visitor experience</h2>
          <Toggle
            label="Send confirmation email to visitor"
            hint="Sends a friendly receipt to the person who submitted the form."
            checked={settings.sendApplicantConfirmation}
            onChange={(v) => setSettings({ ...settings, sendApplicantConfirmation: v })}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-xs tracking-[0.2em] text-muted uppercase">Test delivery</h2>
          <div className="flex flex-wrap gap-3">
            {(["email", "sms", "push", "webhook"] as const).map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() => void sendTest(channel)}
                disabled={testing !== null}
                className="admin-touch-btn border border-stone/50 text-cream capitalize disabled:opacity-50"
              >
                {testing === channel ? "Sending..." : `Test ${channel}`}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            Tests use the recipients configured above. Save your changes first.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs tracking-[0.2em] text-muted uppercase">
              History{unreadCount > 0 ? ` · ${unreadCount} unread` : ""}
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <button
                type="button"
                onClick={() => void patchHistory({ action: "markAllRead" })}
                className="text-accent hover:underline"
              >
                Mark all read
              </button>
              <a
                href="/api/admin/notifications/history/export"
                className="text-accent hover:underline"
              >
                Export CSV
              </a>
              <button
                type="button"
                onClick={() => void loadHistory()}
                className="text-accent hover:underline"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipient, subject, error..."
              className="min-w-[200px] flex-1 border border-stone/50 bg-charcoal px-3 py-2 text-sm text-cream"
            />
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full border border-stone/50 bg-charcoal px-3 py-2.5 text-sm text-cream sm:w-auto"
              aria-label="Filter by channel"
            >
              <option value="">All channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="push">Push</option>
              <option value="webhook">Webhook</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-stone/50 bg-charcoal px-3 py-2.5 text-sm text-cream sm:w-auto"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
            </select>
            <label className="flex items-center gap-2 px-1 text-xs text-fog">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Archived
            </label>
          </div>

          {history.length === 0 ? (
            <p className="rounded border border-stone/30 bg-charcoal/30 px-4 py-6 text-center text-sm text-muted">
              No notifications match your filters.
            </p>
          ) : (
            <div className="overflow-x-auto rounded border border-stone/30">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-stone/30 text-xs tracking-wider text-muted uppercase">
                  <tr>
                    <th className="px-3 py-2 font-normal">When</th>
                    <th className="px-3 py-2 font-normal">Form</th>
                    <th className="px-3 py-2 font-normal">Channel</th>
                    <th className="px-3 py-2 font-normal">Recipient</th>
                    <th className="px-3 py-2 font-normal">Status</th>
                    <th className="px-3 py-2 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-stone/20 align-top ${
                        row.read ? "" : "bg-accent/5"
                      }`}
                    >
                      <td className="px-3 py-2 text-xs text-fog whitespace-nowrap">
                        <TimeStamp iso={row.createdAt} />
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded border px-2 py-0.5 text-[0.65rem] uppercase ${
                            FORM_BADGE[row.formType] || "border-stone/40 bg-stone/20 text-fog"
                          }`}
                        >
                          {FORM_TYPE_LABELS[row.formType] || row.formType}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-cream-dim uppercase">{row.channel}</td>
                      <td className="px-3 py-2 text-xs text-fog">
                        <span className="block max-w-[200px] truncate">{row.recipient || "—"}</span>
                        {row.error && (
                          <span className="mt-1 block max-w-[240px] text-[0.7rem] text-red-300">
                            {row.error}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[0.7rem] ${
                            STATUS_STYLES[row.status] || "bg-stone/30 text-fog"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2 text-xs">
                          {row.status === "failed" && (
                            <button
                              type="button"
                              onClick={() => void retry(row.id)}
                              disabled={busyRow === row.id}
                              className="text-accent hover:underline disabled:opacity-50"
                            >
                              Retry
                            </button>
                          )}
                          {!row.read && (
                            <button
                              type="button"
                              onClick={() => void patchHistory({ id: row.id, read: true }, row.id)}
                              disabled={busyRow === row.id}
                              className="text-fog hover:text-cream disabled:opacity-50"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              void patchHistory({ id: row.id, archived: !row.archived }, row.id)
                            }
                            disabled={busyRow === row.id}
                            className="text-fog hover:text-cream disabled:opacity-50"
                          >
                            {row.archived ? "Unarchive" : "Archive"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xs tracking-[0.2em] text-muted uppercase">Activity log</h2>
          {activity.length === 0 ? (
            <p className="rounded border border-stone/30 bg-charcoal/30 px-4 py-6 text-center text-sm text-muted">
              No admin activity recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-stone/20 rounded border border-stone/30">
              {activity.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <span className="text-xs text-fog">
                    <TimeStamp iso={entry.createdAt} />
                  </span>
                  <span className="rounded bg-stone/20 px-2 py-0.5 text-[0.65rem] text-cream-dim">
                    {entry.actor}
                  </span>
                  <span className="text-sm text-cream">{entry.action}</span>
                  {entry.details && <span className="text-xs text-muted">— {entry.details}</span>}
                  {entry.ip && <span className="ml-auto text-[0.7rem] text-muted">{entry.ip}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <SaveBar
        onSave={() => void persist()}
        saving={saving}
        message={message}
        autosaveNote={dirty ? "Unsaved changes" : ""}
      />
    </AdminShell>
  );
}
