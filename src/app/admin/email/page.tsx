"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminToast } from "@/components/admin/AdminToast";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";

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

  const load = useCallback(async () => {
    const res = await adminFetch("/api/admin/email/send");
    if (res.ok) {
      const data = await res.json();
      setReady(Boolean(data.ready));
      setTemplates(data.templates ?? []);
      setRecent(data.recent ?? []);
      if (data.templates?.[0]) setTemplateId(data.templates[0].id);
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
      <AdminPageHeader
        eyebrow="Grow"
        title="Email"
        description="Send real follow-ups via Resend. Campaign builder and analytics come later — this is execute-first Email v1."
      />

      {!ready && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-fog">
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
            className="border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
          />
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream sm:col-span-2"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.subject}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={sending || !to || !ready}
          onClick={() => void send()}
          className="mt-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-xs text-accent uppercase disabled:opacity-40"
        >
          {sending ? "Sending…" : "Send email"}
        </button>
      </AdminPanel>

      <AdminPanel title="Recent sends" className="mb-8">
        {recent.length === 0 ? (
          <p className="text-sm text-muted">No email sends logged yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-stone/15 py-2">
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
    </AdminShell>
  );
}
