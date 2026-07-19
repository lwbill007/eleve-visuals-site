"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminToast } from "@/components/admin/AdminToast";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { OsCapabilityGrid, type OsCapability } from "@/components/admin/os/OsCapabilityGrid";
import {
  WorkspaceButton,
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/admin/os/WorkspaceFrame";
import { METRIC_OWNERS } from "@/lib/ai/platform/metric-owners";
import { osEyebrow } from "@/lib/ai/platform/os-systems";

interface Template {
  id: string;
  name: string;
  subject: string;
}

export default function EmailPage() {
  const { toast } = useAdminToast();
  const [ready, setReady] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recent, setRecent] = useState<
    { id: string; recipient: string; subject: string; status: string; createdAt: string }[]
  >([]);
  const [to, setTo] = useState("");
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("follow_up_booking");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch("/api/admin/email/send");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setReady(Boolean(data.ready));
      setTemplates(data.templates ?? []);
      setRecent(data.recent ?? []);
      if (data.templates?.[0]) setTemplateId(data.templates[0].id);
    } catch {
      setError("Could not load email workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    setSending(true);
    const res = await adminFetch("/api/admin/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, name, templateId }),
    });
    const data = await res.json();
    if (res.ok) {
      toast(`Sent to ${data.to}`);
      setTo("");
      void load();
    } else toast(data.error || "Send failed.", "error");
    setSending(false);
  }

  const emailCapabilities: OsCapability[] = useMemo(() => {
    const owner = METRIC_OWNERS.clients;
    return [
      {
        id: "templates",
        label: "Templates",
        status: templates.length > 0 ? "live" : "planned",
        summary:
          templates.length > 0
            ? `${templates.length} sendable template${templates.length === 1 ? "" : "s"}.`
            : "Templates load from the email API when ready.",
        missing:
          templates.length > 0
            ? undefined
            : {
                label: "Templates",
                reason: "No email templates available",
                required: ["Email API ready", "Template definitions"],
                confidence: 0,
                unlockAfter: "Unlock after email templates load",
                owner,
                unlockHref: "/admin/qa",
              },
      },
      {
        id: "send",
        label: "One-off send",
        status: ready ? "live" : "planned",
        summary: ready
          ? "Resend is configured for template sends."
          : "Resend keys required before sends.",
        missing: ready
          ? undefined
          : {
              label: "Email send",
              reason: "RESEND_API_KEY / EMAIL_FROM not ready",
              required: ["RESEND_API_KEY", "EMAIL_FROM"],
              confidence: 0,
              unlockAfter: "Unlock after Resend env is set",
              owner,
              unlockHref: "/admin/qa",
            },
      },
      {
        id: "sequences",
        label: "Sequences",
        status: "planned",
        summary: "Automated nurture sequences are not instrumented.",
        missing: {
          label: "Sequences",
          reason: "No sequence / drip engine",
          required: ["Sequence entity", "Trigger rules", "Send log"],
          confidence: 0,
          unlockAfter: "Unlock after sequence engine",
          owner,
          unlockHref: "/admin/qa",
        },
      },
      {
        id: "opens",
        label: "Open / click rates",
        status: "planned",
        summary: "Engagement metrics require provider webhooks — never invent open rates.",
        missing: {
          label: "Email engagement",
          reason: "No open/click webhook ingest",
          required: ["Resend webhooks", "Event store"],
          confidence: 0,
          unlockAfter: "Unlock after email engagement webhooks",
          owner: METRIC_OWNERS.analytics,
          unlockHref: "/admin/analytics",
        },
      },
    ];
  }, [ready, templates.length]);

  return (
    <AdminShell title="Email">
      <WorkspaceChrome
        eyebrow={osEyebrow("grow", "What should we send?")}
        title="Email"
        description="Campaigns, sequences, and AI-written follow-ups. Template sends are live when Resend is ready; sequences and engagement stay MissingMetric."
        onRefresh={() => void load()}
        refreshing={loading}
        related={[
          { label: "Marketing", href: "/admin/marketing", desc: "What campaigns should run?" },
          { label: "Clients", href: "/admin/crm", desc: "Who is this customer?" },
          { label: "Inbox", href: "/admin/submissions", desc: "What needs a reply?" },
          { label: "Executive QA", href: "/admin/qa", desc: "What is broken or incomplete?" },
        ]}
      >
        {loading && templates.length === 0 ? (
          <WorkspaceLoading />
        ) : error ? (
          <WorkspaceError message={error} onRetry={() => void load()} />
        ) : (
          <>
            <OsCapabilityGrid
              className="mb-8"
              title="Email capabilities"
              subtitle="Never invent open rates or sequence performance."
              capabilities={emailCapabilities}
            />
            {!ready && (
              <div
                className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-fog"
                role="status"
              >
                Resend not ready — set <code className="text-cream">RESEND_API_KEY</code> and{" "}
                <code className="text-cream">EMAIL_FROM</code>. See{" "}
                <Link href="/admin/qa" className="text-accent hover:underline">
                  Executive QA
                </Link>
                .
              </div>
            )}

            <AdminPanel title="Send template" className="mb-8">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Recipient email"
                  aria-label="Recipient email"
                  className="rounded-lg border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
                />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name (optional)"
                  aria-label="Recipient name"
                  className="rounded-lg border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
                />
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  aria-label="Email template"
                  className="rounded-lg border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream sm:col-span-2"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.subject}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3">
                <WorkspaceButton
                  variant="primary"
                  disabled={sending || !to || !ready}
                  onClick={() => void send()}
                >
                  {sending ? "Sending…" : "Send email"}
                </WorkspaceButton>
              </div>
            </AdminPanel>

            <AdminPanel title="Recent sends" className="mb-8">
              {recent.length === 0 ? (
                <WorkspaceEmpty
                  title="No sends yet"
                  detail="Send a template above. Successful sends appear here with status and timestamp."
                />
              ) : (
                <ul className="space-y-2 text-sm">
                  {recent.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap justify-between gap-2 border-b border-stone/15 py-2"
                    >
                      <span className="text-cream">
                        {r.recipient || "—"} · {r.subject || r.status}
                      </span>
                      <span className="text-xs text-muted">
                        {r.status} · {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminPanel>

            <AdminPanel title="AI draft (review before send)">
              <AIGeneratePanel
                task="email_body"
                label="Draft body"
                prompt="Write a short luxury follow-up email for a booking inquiry that has been waiting 3 days."
              />
            </AdminPanel>
          </>
        )}
      </WorkspaceChrome>
    </AdminShell>
  );
}
