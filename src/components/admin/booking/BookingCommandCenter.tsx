"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { formatInquiryId } from "@/lib/booking";
import {
  BOOKING_OPS_TIMELINE,
  DISCOVERY_QUESTIONS,
  POST_SHOOT_CHECKLIST,
  PRE_SHOOT_CHECKLIST,
  buildHealth,
  buildOpportunityMetrics,
  buildRevenue,
  gradeTone,
  opportunityGrade,
  opsTimelineIndex,
  parseOps,
  statusLabel,
  type BookingOpsState,
  type HealthStatus,
} from "@/lib/booking-command";
import {
  INQUIRY_STATUSES,
  INQUIRY_STATUS_LABELS,
  normalizeInquiryStatus,
  type InquiryStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function healthColor(s: HealthStatus): string {
  if (s === "ready") return "border-emerald-400/35 text-emerald-300";
  if (s === "warn") return "border-amber-400/40 text-amber-200";
  if (s === "deferred") return "border-stone/30 text-muted";
  return "border-red-400/40 text-red-300";
}

type BriefPayload = {
  brief: { summary: string; value: Record<string, unknown> } | null;
  proposal: { summary: string; value: Record<string, unknown> } | null;
};

export function BookingCommandCenter({
  submissionId,
  status,
  data,
  notes,
  email,
  returning,
  createdAt,
  compact,
  onStatusChange,
  onNotesChange,
  onDataRefresh,
}: {
  submissionId: string;
  status: string;
  data: Record<string, unknown>;
  notes?: string;
  email?: string;
  returning?: boolean;
  createdAt?: string;
  compact?: boolean;
  onStatusChange?: (status: string) => void;
  onNotesChange?: (notes: string) => void;
  onDataRefresh?: (data: Record<string, unknown>) => void;
}) {
  const q = (data.qualification as Record<string, unknown> | undefined) || {};
  const ops = parseOps(data);
  const [localOps, setLocalOps] = useState<BookingOpsState>(ops);
  const [saving, setSaving] = useState(false);
  const [brief, setBrief] = useState<BriefPayload | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  const [localNotes, setLocalNotes] = useState(notes || "");

  useEffect(() => {
    setLocalOps(parseOps(data));
  }, [data]);

  useEffect(() => {
    setLocalNotes(notes || "");
  }, [notes]);

  const loadBrief = useCallback(async () => {
    setBriefLoading(true);
    try {
      const res = await adminFetch(
        `/api/admin/ai/booking-brief?id=${encodeURIComponent(submissionId)}`
      );
      if (res.ok) setBrief((await res.json()) as BriefPayload);
    } catch {
      /* ignore */
    } finally {
      setBriefLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    void loadBrief();
  }, [loadBrief]);

  const saveOps = async (next: BookingOpsState) => {
    setLocalOps(next);
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: submissionId, ops: next }),
      });
      if (res.ok) {
        onDataRefresh?.({ ...data, ops: next });
      }
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await adminFetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: submissionId, notes: localNotes }),
      });
      onNotesChange?.(localNotes);
    } finally {
      setSaving(false);
    }
  };

  const appendInternalLog = async () => {
    if (!internalNote.trim()) return;
    const entry = { at: new Date().toISOString(), text: internalNote.trim() };
    const next: BookingOpsState = {
      ...localOps,
      internalLog: [...(localOps.internalLog || []), entry],
    };
    setInternalNote("");
    await saveOps(next);
  };

  const revenue = useMemo(() => buildRevenue(data), [data]);
  const health = useMemo(() => buildHealth(data), [data]);
  const metrics = useMemo(() => buildOpportunityMetrics(data), [data]);
  const score = typeof q.leadScore === "number" ? q.leadScore : 50;
  const grade = opportunityGrade(score);
  const timelineIdx = opsTimelineIndex(status, Boolean(returning));
  const name = asString(data.fullName) || "Client";
  const company = asString(data.businessName);
  const packageName =
    asString(q.packageName) || asString(data.packageId) || "Experience TBD";
  const value =
    typeof q.estimatedProjectValue === "number" ? q.estimatedProjectValue : revenue.total;
  const ltv =
    typeof q.potentialLifetimeValue === "number" ? q.potentialLifetimeValue : revenue.ltv;
  const priority = asString(q.priority) || "medium";
  const mail = email || asString(data.email) || "";
  const phone = asString(data.phone) || "";
  const ig = asString(data.instagram)?.replace(/^@/, "") || "";

  const emailHref = (subject: string, body = "") =>
    mail
      ? `/admin/email?to=${encodeURIComponent(mail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      : "/admin/email";

  const aiSummary =
    asString(q.aiSummary) ||
    asString(brief?.brief?.value?.executiveSummary) ||
    brief?.brief?.summary ||
    "Generate or refresh production intel for a fuller executive summary.";

  return (
    <div className={cn("space-y-6", compact ? "mt-4" : "mt-0")}>
      {/* Hero executive summary */}
      <section className="os-glass relative overflow-hidden rounded-xl border border-stone/25 p-5 md:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(184,168,138,0.12)_0%,transparent_55%)]" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-accent/30 bg-accent/10 font-display text-2xl text-accent">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="label-caps text-accent">Project mission control</p>
                <h2 className="font-display mt-1 text-3xl text-cream md:text-4xl">
                  {localOps.projectName || `${name} · ${packageName}`}
                </h2>
                <p className="mt-1 text-sm text-fog">
                  {company ? `${company} · ` : ""}
                  #{formatInquiryId(submissionId)}
                  {createdAt ? ` · Inquiry ${new Date(createdAt).toLocaleDateString()}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={cn(
                  "border px-2.5 py-1 text-[0.65rem] tracking-[0.1em] uppercase",
                  gradeTone(grade)
                )}
              >
                Grade {grade}
              </span>
              <span className="border border-accent/40 px-2.5 py-1 text-[0.65rem] tracking-[0.1em] text-accent uppercase">
                {priority} priority
              </span>
              <span className="border border-stone/40 px-2.5 py-1 text-[0.65rem] tracking-[0.1em] text-cream-dim uppercase">
                {statusLabel(status)}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeroStat label="Package" value={packageName} />
            <HeroStat
              label="Shoot date"
              value={asString(data.preferredDate) || "TBD"}
            />
            <HeroStat label="Location" value={asString(data.location) || "TBD"} />
            <HeroStat
              label="Assigned"
              value={localOps.assignedTo || asString(localOps.team?.leadPhotographer) || "Unassigned"}
            />
            <HeroStat label="Est. revenue" value={revenue.format(value)} accent />
            <HeroStat label="Est. LTV" value={revenue.format(ltv)} accent />
            <HeroStat
              label="Close likelihood"
              value={
                typeof q.likelihoodToClose === "number" ? `${q.likelihoodToClose}%` : "—"
              }
            />
            <HeroStat
              label="Follow-up"
              value={asString(q.idealFollowUpLabel) || "Within 1–2 days"}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <select
              value={normalizeInquiryStatus(status)}
              onChange={(e) => onStatusChange?.(e.target.value)}
              className="rounded-lg border border-stone/30 bg-charcoal/40 px-3 py-2 text-sm text-cream"
              aria-label="Update stage"
            >
              {INQUIRY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {INQUIRY_STATUS_LABELS[s as InquiryStatus]}
                </option>
              ))}
            </select>
            {!compact && (
              <Link
                href={`/admin/submissions?type=booking&focus=${submissionId}`}
                className="rounded-lg border border-stone/30 px-3 py-2 text-xs tracking-[0.08em] text-fog uppercase hover:text-cream"
              >
                Open in inbox
              </Link>
            )}
            <Link
              href={`/admin/bookings/${submissionId}`}
              className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs tracking-[0.08em] text-accent uppercase hover:bg-accent/20"
            >
              Full command center
            </Link>
            {saving && <span className="self-center text-xs text-muted">Saving…</span>}
          </div>
        </div>
      </section>

      {/* Client snapshot + AI summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Client snapshot">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Field label="Email" value={mail || "—"} />
            <Field label="Phone" value={phone || "—"} />
            <Field label="Preferred contact" value={localOps.preferredContact || "Email"} />
            <Field label="Timezone" value={localOps.timezone || "—"} />
            <Field label="Instagram" value={ig ? `@${ig}` : "—"} />
            <Field label="Website" value={asString(data.website) || "—"} />
            <Field label="Referral" value={asString(data.referralSource) || "—"} />
            <Field
              label="Previous bookings"
              value={returning ? "Returning contact" : "First inquiry"}
            />
            <Field
              label="Client since"
              value={createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
            />
            <Field label="CRM segment" value={asString(q.crmSegment) || "—"} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {mail && (
              <a
                href={emailHref(`ÉLEVÉ — Following up on your inquiry`)}
                className="border border-accent/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase"
              >
                Email
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone.replace(/\D/g, "")}`}
                className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
              >
                Call
              </a>
            )}
            {phone && (
              <a
                href={`sms:${phone.replace(/\D/g, "")}`}
                className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
              >
                Text
              </a>
            )}
            {ig && (
              <a
                href={`https://instagram.com/${ig}`}
                target="_blank"
                rel="noreferrer"
                className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
              >
                Instagram
              </a>
            )}
            {mail && (
              <Link
                href={`/admin/crm/${encodeURIComponent(mail)}`}
                className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
              >
                CRM profile
              </Link>
            )}
          </div>
        </Panel>

        <Panel title="AI executive summary">
          <p className="text-sm leading-relaxed text-cream-dim">{aiSummary}</p>
          {asStringArray(q.incompleteSignals).length > 0 && (
            <p className="mt-3 text-xs text-amber-200/90">
              Missing: {asStringArray(q.incompleteSignals).join(" · ")}
            </p>
          )}
          {asStringArray(q.suggestedQuestions).length > 0 && (
            <p className="mt-3 text-xs text-fog">
              Next questions: {asStringArray(q.suggestedQuestions).slice(0, 3).join(" · ")}
            </p>
          )}
          <button
            type="button"
            onClick={() => void loadBrief()}
            className="mt-4 text-[0.65rem] tracking-[0.1em] text-accent uppercase hover:text-cream"
          >
            {briefLoading ? "Refreshing…" : "Refresh production intel"}
          </button>
        </Panel>
      </div>

      {/* Timeline */}
      <Panel title="Booking timeline">
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BOOKING_OPS_TIMELINE.map((stage, i) => {
            const done = i <= timelineIdx;
            const active = i === timelineIdx;
            return (
              <li
                key={stage.id}
                className={cn(
                  "flex items-center gap-2 border-l-2 py-1.5 pl-3 text-xs",
                  active
                    ? "border-accent text-cream"
                    : done
                      ? "border-accent/40 text-cream-dim"
                      : "border-stone/25 text-muted"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    active ? "bg-accent" : done ? "bg-accent/50" : "bg-stone/40"
                  )}
                />
                {stage.label}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[0.65rem] text-muted">
          Stages map to pipeline status where available. Proposal approved / invoice / contract /
          gallery portal stages light up when those systems are connected.
        </p>
      </Panel>

      {/* Health */}
      <Panel title="Booking health">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {health.map((item) => (
            <div
              key={item.key}
              className={cn("border px-3 py-3", healthColor(item.status))}
            >
              <p className="text-[0.65rem] tracking-[0.1em] uppercase">{item.label}</p>
              <p className="mt-1 text-xs text-cream-dim">{item.detail}</p>
              {item.requestSubject && item.status !== "ready" && mail && (
                <Link
                  href={emailHref(item.requestSubject)}
                  className="mt-2 inline-block text-[0.6rem] tracking-[0.08em] text-accent uppercase hover:underline"
                >
                  Request →
                </Link>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* Opportunity analysis */}
      <Panel title="AI opportunity analysis · estimated">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m) => (
            <div key={m.key} className="border border-stone/20 bg-charcoal/20 p-3">
              <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">{m.label}</p>
              <p className="mt-1 font-display text-xl text-cream">{m.value}</p>
              <p className="mt-1 text-[0.7rem] leading-snug text-fog">{m.explain}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* Discovery + Creative brief */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Discovery dashboard">
          <div className="space-y-3">
            {DISCOVERY_QUESTIONS.map((dq) => (
              <label key={dq.id} className="block">
                <span className="text-xs text-fog">{dq.prompt}</span>
                <textarea
                  className="mt-1 w-full border border-stone/30 bg-charcoal/30 p-2 text-sm text-cream"
                  rows={2}
                  value={localOps.discoveryAnswers?.[dq.id] || ""}
                  onChange={(e) =>
                    setLocalOps((prev) => ({
                      ...prev,
                      discoveryAnswers: {
                        ...(prev.discoveryAnswers || {}),
                        [dq.id]: e.target.value,
                      },
                    }))
                  }
                  onBlur={(e) => {
                    const next: BookingOpsState = {
                      ...localOps,
                      discoveryAnswers: {
                        ...(localOps.discoveryAnswers || {}),
                        [dq.id]: e.target.value,
                      },
                    };
                    void saveOps(next);
                  }}
                />
              </label>
            ))}
            <button
              type="button"
              onClick={() => void saveOps(localOps)}
              className="border border-accent/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase"
            >
              Save discovery answers
            </button>
          </div>
        </Panel>

        <Panel title="Creative brief">
          <BriefBlock
            label="Project vision"
            value={
              asString(data.feelingPrompt) ||
              asString(data.projectVision) ||
              asString(brief?.brief?.value?.creativeBrief)
            }
          />
          <BriefBlock label="Goals" value={asString(data.goals) || asString(data.inspirationPrompt)} />
          <BriefBlock label="Audience" value={asString(data.audience)} />
          <BriefBlock
            label="Deliverables"
            value={asStringArray(data.deliverables).join(", ") || undefined}
          />
          <BriefBlock
            label="Visual direction"
            value={asString(data.creativeDirection)}
          />
          <BriefBlock
            label="Locations"
            value={[asString(data.location), asString(data.sessionSetting)]
              .filter(Boolean)
              .join(" · ")}
          />
          <BriefBlock
            label="AI lighting notes"
            value={asStringArray(brief?.brief?.value?.lightingRecommendations).join(" · ")}
          />
          <BriefBlock
            label="Suggested package"
            value={asString(brief?.brief?.value?.suggestedPackage) || packageName}
          />
        </Panel>
      </div>

      {/* Creative strategy — no drone */}
      <Panel title="AI creative strategy · estimated">
        <ul className="grid gap-2 text-sm text-cream-dim sm:grid-cols-2">
          {[
            ["Camera style", packageName.includes("Cinema") || packageName.includes("Films") ? "Cinematic motion + stills hybrid" : "Editorial stills, directed posing"],
            ["Lighting", asString(data.sessionSetting)?.match(/studio/i) ? "Controlled studio key + fill" : "Natural + portable fill / golden hour"],
            ["Lens selection", "35–85mm portrait set · 24mm environment"],
            ["Color grading", packageName.includes("Motion") || packageName.includes("Cinema") ? "Cinematic grade + vertical master" : "Clean editorial polish"],
            ["Production style", asString(q.crmSegment) === "Creative Partner" ? "Retainer / hour-bank production" : "Single-project directed day"],
            ["Audio", packageName.includes("Films") || packageName.includes("Cinema") ? "Lav + ambience recommended" : "N/A for photo-led"],
            ["Second shooter", value >= 900 ? "Recommended" : "Optional"],
            ["Studio", asString(data.sessionSetting)?.match(/studio/i) ? "Confirm studio booking" : "On-location preferred"],
            ["Travel", asString(data.location)?.match(/sacramento/i) ? "Local" : "Assess travel add-on"],
            ["Timeline", asString(data.projectTimeline) || asString(brief?.brief?.value?.suggestedTimeline) || "Consultation → Proposal → Produce → Deliver"],
          ].map(([k, v]) => (
            <li key={k} className="border border-stone/20 px-3 py-2">
              <span className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">{k}</span>
              <p className="mt-0.5 text-cream">{v}</p>
            </li>
          ))}
        </ul>
      </Panel>

      {/* Revenue */}
      <Panel title="Revenue center · estimated">
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Package" value={`${revenue.packageName} · ${revenue.format(revenue.packagePrice)}`} />
          <Field
            label="Add-ons"
            value={
              revenue.addOns.length
                ? revenue.addOns.map((a) => `${a.name} ${revenue.format(a.price)}`).join(", ")
                : "None"
            }
          />
          <Field label="Total" value={revenue.format(revenue.total)} />
          <Field label="Production cost (est.)" value={revenue.format(revenue.productionCost)} />
          <Field label="Profit (est.)" value={revenue.format(revenue.profit)} />
          <Field label="Margin" value={`${revenue.margin}%`} />
          <Field label="Lifetime revenue (est.)" value={revenue.format(revenue.ltv)} />
        </div>
        <p className="mt-3 text-[0.65rem] text-muted">
          Tax / discounts / travel line-items are manual until finance automation is connected.
        </p>
      </Panel>

      {/* Team */}
      <Panel title="Team assignment">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["leadPhotographer", "Lead Photographer"],
              ["secondShooter", "Second Shooter"],
              ["videographer", "Videographer"],
              ["editor", "Editor"],
              ["creativeDirector", "Creative Director"],
              ["assistant", "Assistant"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-xs text-fog">
              {label}
              <input
                className="mt-1 w-full border border-stone/30 bg-charcoal/30 px-2 py-1.5 text-sm text-cream"
                value={localOps.team?.[key] || ""}
                onChange={(e) => {
                  const next: BookingOpsState = {
                    ...localOps,
                    team: { ...(localOps.team || {}), [key]: e.target.value },
                    assignedTo:
                      key === "leadPhotographer" ? e.target.value : localOps.assignedTo,
                  };
                  setLocalOps(next);
                }}
                onBlur={(e) => {
                  const next: BookingOpsState = {
                    ...localOps,
                    team: { ...(localOps.team || {}), [key]: e.target.value },
                    assignedTo:
                      key === "leadPhotographer" ? e.target.value : localOps.assignedTo,
                  };
                  void saveOps(next);
                }}
                placeholder="Name"
              />
            </label>
          ))}
        </div>
        <p className="mt-3 text-[0.65rem] text-muted">
          Assignments save on this booking. Automatic crew notifications are not connected yet —
          notify manually via Email.
        </p>
      </Panel>

      {/* Calendar */}
      <Panel title="Calendar · project dates">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <Field label="Shoot date" value={asString(data.preferredDate) || "TBD"} />
          <Field label="Flexible alternate" value={asString(data.flexibleDate) || "—"} />
          <Field label="Editing deadline" value="Set after booking" />
          <Field label="Gallery delivery" value="Set after production" />
          <Field label="Invoice due" value="Set with retainer" />
          <Field label="Follow-up reminder" value={asString(q.idealFollowUpLabel) || "—"} />
        </div>
        <p className="mt-3 text-[0.65rem] text-muted">
          Google Calendar sync is not connected. Dates shown are from this inquiry.
        </p>
      </Panel>

      {/* Checklists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChecklistPanel
          title="Before shoot"
          items={PRE_SHOOT_CHECKLIST}
          checklist={localOps.checklist || {}}
          prefix="pre:"
          onToggle={(key, checked) => {
            const next = {
              ...localOps,
              checklist: { ...(localOps.checklist || {}), [key]: checked },
            };
            void saveOps(next);
          }}
        />
        <ChecklistPanel
          title="After shoot"
          items={POST_SHOOT_CHECKLIST}
          checklist={localOps.checklist || {}}
          prefix="post:"
          onToggle={(key, checked) => {
            const next = {
              ...localOps,
              checklist: { ...(localOps.checklist || {}), [key]: checked },
            };
            void saveOps(next);
          }}
        />
      </div>

      {/* Files */}
      <Panel title="Client files & links">
        <ul className="space-y-1 text-sm text-fog">
          {(
            [
              ["Mood board", asString(data.moodBoardUrl)],
              ["Pinterest", asString(data.pinterestLink)],
              ["Drive", asString(data.driveLink)],
              ["Website", asString(data.website)],
              ["Inspiration IG", asString(data.inspirationInstagram)],
            ] as const
          ).map(([label, href]) =>
            href ? (
              <li key={label}>
                <a
                  href={href.startsWith("http") ? href : undefined}
                  className="text-accent hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {label}: {href}
                </a>
              </li>
            ) : (
              <li key={label} className="text-muted">
                {label}: —
              </li>
            )
          )}
        </ul>
        <p className="mt-3 text-[0.65rem] text-muted">
          Contracts, invoices, and media uploads attach here when those systems are connected.
        </p>
      </Panel>

      {/* Notes */}
      <Panel title="Internal notes · private">
        <textarea
          className="w-full border border-stone/30 bg-charcoal/30 p-3 text-sm text-cream"
          rows={4}
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          placeholder="Team-only notes, preferences, risks…"
        />
        <button
          type="button"
          onClick={() => void saveNotes()}
          className="mt-2 border border-accent/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase"
        >
          Save notes
        </button>
        <div className="mt-4 border-t border-stone/20 pt-4">
          <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">Timeline log</p>
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-fog">
            {(localOps.internalLog || []).map((e) => (
              <li key={e.at + e.text.slice(0, 12)}>
                <span className="text-muted">{new Date(e.at).toLocaleString()} — </span>
                {e.text}
              </li>
            ))}
            {(localOps.internalLog || []).length === 0 && (
              <li className="text-muted">No log entries yet</li>
            )}
          </ul>
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 border border-stone/30 bg-charcoal/30 px-2 py-1.5 text-sm text-cream"
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Add update…"
            />
            <button
              type="button"
              onClick={() => void appendInternalLog()}
              className="border border-stone/40 px-3 text-xs text-fog uppercase"
            >
              Add
            </button>
          </div>
        </div>
      </Panel>

      {/* Portal — honest deferred */}
      <Panel title="Client portal controls">
        <p className="text-sm text-fog">
          Gallery portal is not connected yet. Controls below are reserved for when client
          access ships.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 opacity-50">
          {[
            "Enable Gallery",
            "Disable Gallery",
            "Generate Access Code",
            "Resend Access Code",
            "Expire Gallery",
            "Extend Gallery",
            "Allow Downloads",
            "Disable Downloads",
          ].map((label) => (
            <button
              key={label}
              type="button"
              disabled
              className="cursor-not-allowed border border-stone/25 px-3 py-1.5 text-[0.6rem] tracking-[0.08em] text-muted uppercase"
            >
              {label}
            </button>
          ))}
        </div>
      </Panel>

      {/* Communication + Automation */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Communication center">
          <div className="flex flex-wrap gap-2">
            <Link
              href={emailHref("ÉLEVÉ — Your project update")}
              className="border border-accent/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase"
            >
              Compose email
            </Link>
            <Link
              href="/admin/notifications"
              className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
            >
              Notification log
            </Link>
            {mail && (
              <Link
                href={`/admin/crm/${encodeURIComponent(mail)}`}
                className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
              >
                CRM history
              </Link>
            )}
          </div>
          <p className="mt-3 text-[0.65rem] text-muted">
            SMS/call logs unify here when messaging providers are connected. AI summaries appear
            above.
          </p>
        </Panel>

        <Panel title="Automation center · human approval">
          <div className="flex flex-wrap gap-2">
            <Link
              href={emailHref(
                "ÉLEVÉ Visuals — Project proposal",
                [
                  `Hi ${name.split(" ")[0]},`,
                  "",
                  aiSummary,
                  "",
                  `Suggested package: ${packageName}`,
                  `Investment signal: ${revenue.format(value)} (estimated)`,
                  "",
                  "Billy · ÉLEVÉ Visuals",
                ].join("\n")
              )}
              className="border border-accent/40 bg-accent/10 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase"
            >
              Generate / send proposal
            </Link>
            <Link
              href={emailHref("ÉLEVÉ — Mood board request")}
              className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
            >
              Request mood board
            </Link>
            <Link
              href={emailHref("ÉLEVÉ — Discovery call")}
              className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
            >
              Schedule discovery
            </Link>
            <Link
              href="/admin/payments"
              className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
            >
              Request payment
            </Link>
            <Link
              href="/admin/pipeline"
              className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
            >
              Open pipeline
            </Link>
            <button
              type="button"
              onClick={() => onStatusChange?.("archived")}
              className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
            >
              Archive project
            </button>
          </div>
          <p className="mt-3 text-[0.65rem] text-muted">
            Contract / invoice / studio booking automations stay manual until those connectors
            ship. Nothing auto-sends without you.
          </p>
        </Panel>
      </div>

      {/* Proposal draft from memory */}
      {brief?.proposal && (
        <Panel title="Proposal draft · human approval required">
          <p className="text-sm text-cream">
            {asString(brief.proposal.value.package) || packageName}
          </p>
          <p className="mt-1 text-xs text-fog">
            {asString(brief.proposal.value.timeline) || "Timeline TBD"}
          </p>
          <Link
            href={emailHref("ÉLEVÉ Visuals — Project proposal", brief.proposal.summary || "")}
            className="mt-3 inline-block border border-accent/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase"
          >
            Review & send via Email →
          </Link>
        </Panel>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-stone/20 bg-charcoal/15 p-4 md:p-5">
      <p className="mb-3 text-[0.55rem] tracking-[0.14em] text-accent uppercase">{title}</p>
      {children}
    </section>
  );
}

function HeroStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border border-stone/20 bg-ink/30 px-3 py-2.5">
      <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">{label}</p>
      <p className={cn("mt-1 truncate text-sm", accent ? "font-display text-lg text-accent" : "text-cream")}>
        {value}
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-cream break-words">{value}</dd>
    </div>
  );
}

function BriefBlock({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="mb-3">
      <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-cream-dim">{value}</p>
    </div>
  );
}

function ChecklistPanel({
  title,
  items,
  checklist,
  prefix,
  onToggle,
}: {
  title: string;
  items: readonly string[];
  checklist: Record<string, boolean>;
  prefix: string;
  onToggle: (key: string, checked: boolean) => void;
}) {
  return (
    <Panel title={title}>
      <ul className="space-y-2">
        {items.map((item) => {
          const key = `${prefix}${item}`;
          const checked = Boolean(checklist[key]);
          return (
            <li key={key}>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-cream-dim">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onToggle(key, e.target.checked)}
                  className="accent-[var(--color-accent)]"
                />
                <span className={checked ? "text-fog line-through" : ""}>{item}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
