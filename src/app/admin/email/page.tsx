"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminToast } from "@/components/admin/AdminToast";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import {
  WorkspaceButton,
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/admin/os/WorkspaceFrame";

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

  return (
    <AdminShell title="Email">
      <WorkspaceChrome
        eyebrow="Grow · Email"
        title="Email"
        description="What was sent, why a follow-up is due, and what to do next — send a template or draft with AI. Execute-first Email v1."
        onRefresh={() => void load()}
        refreshing={loading}
        related={[
          { label: "Workboard", href: "/admin/workboard", desc: "Inbox" },
          { label: "Clients", href: "/admin/crm", desc: "People" },
          { label: "Marketing", href: "/admin/marketing", desc: "Campaigns" },
          { label: "Missing Intel", href: "/admin/qa", desc: "Setup" },
        ]}
      >
        {loading && templates.length === 0 ? (
          <WorkspaceLoading />
        ) : error ? (
          <WorkspaceError message={error} onRetry={() => void load()} />
        ) : (
          <>
            {!ready && (
              <div
                className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-fog"
                role="status"
              >
                Resend not ready — set <code className="text-cream">RESEND_API_KEY</code> and{" "}
                <code className="text-cream">EMAIL_FROM</code>. See{" "}
                <Link href="/admin/qa" className="text-accent hover:underline">
                  Missing Intel
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
