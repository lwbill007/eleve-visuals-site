"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import type { CRMContactIntelligence } from "@/lib/ai/types";
import { AskAIButton } from "./AskAIPanel";
import { useSetAIPage } from "./AIContextProvider";
import { AdminPanel, AdminStatusBadge } from "@/components/admin/os/AdminOSComponents";
import {
  WorkspaceChrome,
  WorkspaceLoading,
  WorkspaceButton,
} from "@/components/admin/os/WorkspaceFrame";

export function CRMProfileClient({ email }: { email: string }) {
  const [intel, setIntel] = useState<CRMContactIntelligence | null>(null);
  const [aiOutput, setAiOutput] = useState("");
  const [loadingAI, setLoadingAI] = useState<string | null>(null);

  useEffect(() => {
    adminFetch(`/api/admin/ai/crm/${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then(setIntel);
  }, [email]);

  useSetAIPage("crm_profile", intel ? { contact: intel.contact, ltv: intel.predictedLTV } : undefined, intel?.contact.name);

  async function generate(type: "summary" | "email" | "upsell") {
    setLoadingAI(type);
    setAiOutput("");
    const res = await adminFetch(`/api/admin/ai/crm/${encodeURIComponent(email)}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = res.ok ? await res.json() : { content: "Generation failed." };
    setAiOutput(data.content);
    setLoadingAI(null);
  }

  if (!intel) {
    return (
      <WorkspaceChrome
        eyebrow="AI CRM"
        title={email}
        description="What: client intelligence for this contact. Why: know LTV and next action. Next: draft follow-up. AI personalizes outreach — you send."
        related={[
          { label: "Clients", href: "/admin/crm", desc: "All people" },
          { label: "Pipeline", href: "/admin/pipeline", desc: "Deals" },
          { label: "Email", href: "/admin/email", desc: "Send" },
        ]}
      >
        <WorkspaceLoading rows={4} />
      </WorkspaceChrome>
    );
  }

  const { contact } = intel;

  return (
    <WorkspaceChrome
      eyebrow="AI CRM"
      title={contact.name || contact.email}
      description={`What: relationship intelligence for ${contact.email}. Why: predicted LTV and next best action. Next: send follow-up or upsell. AI drafts personalized outreach — you review and send.`}
      extra={
        <div className="flex gap-2">
          <AskAIButton />
          <WorkspaceButton href="/admin/crm" variant="secondary">
            ← CRM
          </WorkspaceButton>
        </div>
      }
      related={[
        { label: "Clients", href: "/admin/crm", desc: "All people" },
        { label: "Pipeline", href: "/admin/pipeline", desc: "Deals" },
        { label: "Email", href: "/admin/email", desc: "Send" },
        { label: "Bookings", href: "/admin/submissions?type=booking", desc: "Inquiries" },
      ]}
    >
      <div className="space-y-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminPanel className="!p-4">
            <p className="text-[0.6rem] uppercase text-muted">Predicted LTV</p>
            <p className="mt-1 font-display text-2xl text-cream">${intel.predictedLTV.toLocaleString()}</p>
          </AdminPanel>
          <AdminPanel className="!p-4">
            <p className="text-[0.6rem] uppercase text-muted">Booking Probability</p>
            <p className="mt-1 font-display text-2xl text-accent">{intel.bookingProbability}%</p>
          </AdminPanel>
          <AdminPanel className="!p-4">
            <p className="text-[0.6rem] uppercase text-muted">Last Active</p>
            <p className="mt-1 font-display text-2xl text-cream">{intel.daysSinceActivity}d</p>
          </AdminPanel>
          <AdminPanel className="!p-4">
            <p className="text-[0.6rem] uppercase text-muted">Contact By</p>
            <p className="mt-1 font-display text-lg text-cream">{intel.recommendedContactDate}</p>
          </AdminPanel>
          <AdminPanel className="!p-4">
            <p className="text-[0.6rem] uppercase text-muted">Revenue Generated</p>
            <p className="mt-1 font-display text-2xl text-cream">${intel.revenueGenerated.toLocaleString()}</p>
          </AdminPanel>
          <AdminPanel className="!p-4">
            <p className="text-[0.6rem] uppercase text-muted">Last Conversation</p>
            <p className="mt-1 text-sm text-cream">{intel.lastConversation}</p>
          </AdminPanel>
        </div>

        <AdminPanel title="Recommended Next Action" subtitle={intel.nextBestAction}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-[0.65rem] uppercase text-muted">Suggested Email</p>
              <p className="mt-2 whitespace-pre-wrap rounded-lg border border-stone/20 bg-ink/40 p-3 text-xs text-cream-dim">
                {intel.suggestedEmail}
              </p>
              <button type="button" onClick={() => generate("email")} className="mt-2 text-xs text-accent uppercase">
                {loadingAI === "email" ? "Generating…" : "✦ Generate personalized email"}
              </button>
            </div>
            <div>
              <p className="text-[0.65rem] uppercase text-muted">Suggested Text Message</p>
              <p className="mt-2 whitespace-pre-wrap rounded-lg border border-stone/20 bg-ink/40 p-3 text-xs text-cream-dim">
                {intel.suggestedText}
              </p>
            </div>
          </div>
        </AdminPanel>

        <div className="grid gap-4 lg:grid-cols-2">
          <AdminPanel title="AI Summary" subtitle="Relationship overview">
            <p className="text-sm text-cream-dim">{intel.conversationSummary}</p>
            <p className="mt-3 text-sm text-accent">{intel.recommendedFollowUp}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => generate("summary")} className="text-xs text-accent uppercase">
                {loadingAI === "summary" ? "Generating…" : "✦ Expand summary"}
              </button>
              <button type="button" onClick={() => generate("email")} className="text-xs text-accent uppercase">
                {loadingAI === "email" ? "Generating…" : "✦ Email draft"}
              </button>
              <button type="button" onClick={() => generate("upsell")} className="text-xs text-accent uppercase">
                {loadingAI === "upsell" ? "Generating…" : "✦ Upsell offer"}
              </button>
            </div>
            {aiOutput && (
              <div className="mt-4 rounded-lg border border-stone/20 bg-ink/40 p-4">
                <p className="mb-2 text-[0.65rem] uppercase text-muted">Draft — review before sending</p>
                <p className="whitespace-pre-wrap text-sm text-cream-dim">{aiOutput}</p>
              </div>
            )}
          </AdminPanel>

          <AdminPanel title="Upsell Recommendations">
            {intel.upsells.length > 0 ? (
              <ul className="space-y-2">
                {intel.upsells.map((u) => (
                  <li key={u} className="flex items-center gap-2 text-sm text-cream">
                    <span className="text-accent">◆</span> {u}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No upsells identified yet.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {contact.tags.map((t) => (
                <span key={t} className="rounded-full border border-stone/30 px-2 py-0.5 text-xs text-fog">
                  {t}
                </span>
              ))}
              <AdminStatusBadge status={contact.status} />
            </div>
          </AdminPanel>
        </div>

        <AdminPanel title="Booking History">
          {intel.bookingHistory.length === 0 ? (
            <p className="text-sm text-muted">No bookings yet.</p>
          ) : (
            <ul className="space-y-2">
              {intel.bookingHistory.map((b) => (
                <li key={b.id} className="flex justify-between gap-4 text-sm">
                  <span className="text-cream">{b.service || "Booking"} · {b.status}</span>
                  <span className="text-muted">{new Date(b.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel title="Relationship Timeline">
          <ul className="space-y-3">
            {intel.timeline.map((event) => (
              <li key={event.id} className="flex gap-3 border-l border-stone/30 pl-4">
                <div>
                  <p className="text-sm text-cream">{event.label}</p>
                  <p className="text-xs text-muted">{new Date(event.createdAt).toLocaleString()} · {event.status}</p>
                  <Link href={event.href} className="text-xs text-accent hover:underline">
                    View →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </AdminPanel>
      </div>
    </WorkspaceChrome>
  );
}
