"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { formatInquiryId } from "@/lib/booking";
import {
  CLIENT_JOURNEY_TIMELINE,
  POST_SHOOT_CHECKLIST,
  PRE_SHOOT_CHECKLIST,
  buildActivityTimeline,
  buildRevenue,
  clientJourneyIndex,
  defaultBookingTasks,
  gradeTone,
  groupBookingTasks,
  parseOps,
  statusLabel,
  type BookingOpsState,
  type BookingTask,
  type BookingTaskStatus,
} from "@/lib/booking-command";
import { getPackageById } from "@/lib/booking-packages";
import {
  INQUIRY_STATUSES,
  INQUIRY_STATUS_LABELS,
  normalizeInquiryStatus,
  type InquiryStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { buildLeadIntel } from "@/lib/booking-lead-intel";
import { LeadQualificationPanel } from "./LeadQualificationPanel";

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function priorityBadge(p: string) {
  if (p === "urgent") return "border-red-400/50 text-red-300 bg-red-400/10";
  if (p === "high") return "border-amber-400/45 text-amber-200 bg-amber-400/10";
  if (p === "medium") return "border-accent/40 text-accent bg-accent/10";
  return "border-stone/40 text-muted";
}

function taskStatusTone(s: BookingTaskStatus) {
  if (s === "overdue") return "text-red-300";
  if (s === "done") return "text-emerald-300";
  if (s === "todo") return "text-accent";
  return "text-fog";
}

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
  const [internalNote, setInternalNote] = useState("");
  const [localNotes, setLocalNotes] = useState(notes || "");

  useEffect(() => {
    setLocalOps(parseOps(data));
  }, [data]);

  useEffect(() => {
    setLocalNotes(notes || "");
  }, [notes]);

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
  const leadIntel = useMemo(() => buildLeadIntel(data), [data]);
  const journeyIdx = clientJourneyIndex(status, Boolean(returning));
  const name = asString(data.fullName) || "Client";
  const company = asString(data.businessName);
  const packageName =
    asString(q.packageName) || asString(data.packageId) || "Experience TBD";
  const pkg = getPackageById(asString(data.packageId) || asString(q.packageId) || "");
  const value = leadIntel.metrics.estimatedProjectValue;
  const priority = leadIntel.metrics.priority;
  const grade = leadIntel.bookingIntelligence.opportunityGrade;
  const mail = email || asString(data.email) || "";
  const phone = asString(data.phone) || "";
  const ig = asString(data.instagram)?.replace(/^@/, "") || "";
  const hasRefs = leadIntel.missingAssets.every(
    (a) => a.label !== "Visual References" || !a.missing
  );

  const emailHref = (subject: string, body = "") =>
    mail
      ? `/admin/email?to=${encodeURIComponent(mail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      : "/admin/email";

  const tasks: BookingTask[] = useMemo(() => {
    if (localOps.tasks && localOps.tasks.length > 0) return localOps.tasks;
    return defaultBookingTasks({
      status,
      assignedTo: localOps.assignedTo || localOps.team?.leadPhotographer,
      hasRefs,
      hasDate: Boolean(asString(data.preferredDate)),
      priority,
    });
  }, [localOps, status, hasRefs, data.preferredDate, priority]);

  const grouped = useMemo(() => groupBookingTasks(tasks), [tasks]);

  const persistTasks = (nextTasks: BookingTask[]) => {
    void saveOps({ ...localOps, tasks: nextTasks });
  };

  const toggleTaskDone = (id: string) => {
    const next = tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            status: (t.status === "done" ? "todo" : "done") as BookingTaskStatus,
          }
        : t
    );
    persistTasks(next);
  };

  const activity = useMemo(
    () =>
      buildActivityTimeline({
        createdAt,
        status,
        qualificationGeneratedAt: asString(q.generatedAt),
        internalLog: localOps.internalLog,
        packageName,
      }),
    [createdAt, status, q.generatedAt, localOps.internalLog, packageName]
  );

  const deliverables =
    asStringArray(data.deliverables).join(", ") ||
    (pkg?.exampleDeliverables?.length
      ? pkg.exampleDeliverables.slice(0, 4).join(", ")
      : pkg?.included?.length
        ? pkg.included.slice(0, 4).join(", ")
        : "—");

  return (
    <div className={cn("space-y-5", compact ? "mt-4" : "mt-0")}>
      {/* 1. Sticky Executive Header */}
      <header
        className={cn(
          "z-30 border border-stone/30 bg-ink/90 backdrop-blur-md",
          compact ? "relative rounded-xl" : "sticky top-0 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-3 md:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display truncate text-2xl text-cream md:text-3xl">{name}</h1>
              {returning && (
                <span className="border border-accent/35 px-2 py-0.5 text-[0.55rem] tracking-[0.1em] text-accent uppercase">
                  Returning
                </span>
              )}
              <span
                className={cn(
                  "border px-2 py-0.5 text-[0.55rem] tracking-[0.1em] uppercase",
                  priorityBadge(priority)
                )}
              >
                {priority}
              </span>
              <span
                className={cn(
                  "border px-2 py-0.5 text-[0.55rem] tracking-[0.1em] uppercase",
                  gradeTone(grade)
                )}
              >
                {grade}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-fog">
              {packageName}
              {company ? ` · ${company}` : ""}
              {" · "}
              {statusLabel(status)}
              {" · "}
              <span className="text-accent">${value.toLocaleString()}</span>
              {" · "}#{formatInquiryId(submissionId)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {phone && (
              <a
                href={`tel:${phone.replace(/\D/g, "")}`}
                className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase hover:text-cream"
              >
                Call
              </a>
            )}
            {mail && (
              <a
                href={emailHref("ÉLEVÉ — Following up on your inquiry")}
                className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase hover:text-cream"
              >
                Email
              </a>
            )}
            {phone && (
              <a
                href={`sms:${phone.replace(/\D/g, "")}`}
                className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase hover:text-cream"
              >
                Text
              </a>
            )}
            <Link
              href={emailHref(
                "ÉLEVÉ Visuals — Project proposal",
                [
                  `Hi ${name.split(" ")[0]},`,
                  "",
                  leadIntel.executiveSummary,
                  "",
                  `Next: ${leadIntel.proposal.nextStep}`,
                  "",
                  "Billy · ÉLEVÉ Visuals",
                ].join("\n")
              )}
              className="border border-accent/40 bg-accent/10 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase hover:bg-accent/20"
            >
              Generate Proposal
            </Link>
            <Link
              href={emailHref(
                "ÉLEVÉ — Creative consultation",
                `Hi ${name.split(" ")[0]},\n\nI'd love to schedule a ${leadIntel.salesStrategy.estimatedLength} ${leadIntel.salesStrategy.meetingType.toLowerCase()} to align on vision before we draft a proposal.\n\nBilly · ÉLEVÉ Visuals`
              )}
              className="border border-accent/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase hover:bg-accent/10"
            >
              Schedule Consultation
            </Link>
            <select
              value={normalizeInquiryStatus(status)}
              onChange={(e) => onStatusChange?.(e.target.value)}
              className="rounded-md border border-stone/30 bg-charcoal/50 px-2 py-1.5 text-xs text-cream"
              aria-label="Update project status"
            >
              {INQUIRY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {INQUIRY_STATUS_LABELS[s as InquiryStatus]}
                </option>
              ))}
            </select>
            {saving && <span className="text-[0.65rem] text-muted">Saving…</span>}
          </div>
        </div>
      </header>

      {/* 2 + 3. Project Overview · Client Profile */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Project Overview">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Field label="Category" value={asString(data.projectCategory) || pkg?.projectCategory || "—"} />
            <Field label="Service" value={packageName} />
            <Field
              label="Project Purpose"
              value={
                asString(data.purpose) ||
                asString(data.feelingPrompt) ||
                "—"
              }
            />
            <Field label="Target Audience" value={asString(data.audience) || "—"} />
            <Field label="Deliverables" value={deliverables} />
            <Field label="Preferred Date" value={asString(data.preferredDate) || "TBD"} />
            <Field label="Flexible Date" value={asString(data.flexibleDate) || "—"} />
            <Field
              label="Duration"
              value={asString(data.duration) || pkg?.estimatedTimeline || "—"}
            />
            <Field
              label="Session Type"
              value={asString(data.sessionSetting) || "—"}
            />
            <Field label="Location" value={asString(data.location) || "TBD"} />
            <Field
              label="Budget"
              value={asString(data.budgetRange) || `~$${value.toLocaleString()} est.`}
            />
          </dl>
        </Panel>

        <Panel title="Client Profile">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <Field label="Name" value={name} />
            <Field label="Email" value={mail || "—"} />
            <Field label="Phone" value={phone || "—"} />
            <Field label="Instagram" value={ig ? `@${ig}` : "—"} />
            <Field
              label="Preferred Contact"
              value={localOps.preferredContact || "Email"}
            />
            <Field label="Referral Source" value={asString(data.referralSource) || "—"} />
            <Field
              label="Previous Projects"
              value={returning ? "Returning contact" : "First inquiry"}
            />
            <Field
              label="Lifetime Revenue"
              value={revenue.format(leadIntel.bookingIntelligence.estimatedLifetimeValue)}
            />
          </dl>
          <div className="mt-3">
            <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">Notes</p>
            <textarea
              className="mt-1 w-full border border-stone/30 bg-charcoal/30 p-2 text-sm text-cream"
              rows={3}
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={() => void saveNotes()}
              placeholder="Private client notes…"
            />
          </div>
          {mail && (
            <Link
              href={`/admin/crm/${encodeURIComponent(mail)}`}
              className="mt-2 inline-block text-[0.65rem] tracking-[0.1em] text-accent uppercase hover:underline"
            >
              Open CRM profile →
            </Link>
          )}
        </Panel>
      </div>

      {/* 4. Project Timeline */}
      <Panel title="Project Timeline">
        <ol className="flex gap-0 overflow-x-auto pb-2">
          {CLIENT_JOURNEY_TIMELINE.map((stage, i) => {
            const done = i < journeyIdx;
            const active = i === journeyIdx;
            return (
              <li key={stage.id} className="flex min-w-[7.5rem] flex-1 flex-col items-center px-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-[0.65rem]",
                    active
                      ? "border-accent bg-accent/20 text-accent"
                      : done
                        ? "border-accent/50 bg-accent/10 text-cream-dim"
                        : "border-stone/30 text-muted"
                  )}
                >
                  {i + 1}
                </div>
                <p
                  className={cn(
                    "mt-2 text-center text-[0.65rem] leading-snug",
                    active ? "text-cream" : done ? "text-cream-dim" : "text-muted"
                  )}
                >
                  {stage.label}
                </p>
                {i < CLIENT_JOURNEY_TIMELINE.length - 1 && (
                  <span className="sr-only">then</span>
                )}
              </li>
            );
          })}
        </ol>
        <div className="mt-2 hidden h-px bg-gradient-to-r from-transparent via-stone/40 to-transparent sm:block" />
        <p className="mt-2 text-[0.65rem] text-muted">
          Stage advances with pipeline status. Deposit, moodboard, and gallery light up when those
          systems connect.
        </p>
      </Panel>

      {/* 5–14 AI / sales intel — single source for scores & summaries */}
      <LeadQualificationPanel
        data={data}
        email={mail}
        submissionId={submissionId}
        hideMetricsInHeader
      />

      {/* 15. Tasks */}
      <Panel title="Tasks">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ["Today’s Tasks", grouped.today],
              ["Upcoming Tasks", grouped.upcoming],
              ["Overdue Tasks", grouped.overdue],
              ["Completed Tasks", grouped.completed],
            ] as const
          ).map(([label, list]) => (
            <div key={label} className="border border-stone/20 bg-black/15 p-3">
              <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">{label}</p>
              <ul className="mt-2 space-y-2">
                {list.length === 0 && (
                  <li className="text-xs text-muted">None</li>
                )}
                {list.map((t) => (
                  <li key={t.id} className="border border-stone/15 px-2 py-2">
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={t.status === "done"}
                        onChange={() => toggleTaskDone(t.id)}
                        className="mt-0.5 accent-[var(--color-accent)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-sm",
                            t.status === "done" ? "text-fog line-through" : "text-cream"
                          )}
                        >
                          {t.title}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-2 text-[0.6rem] text-muted uppercase">
                          <span className={taskStatusTone(t.status)}>{t.status}</span>
                          <span>{t.priority}</span>
                          <span>{t.owner}</span>
                          <span>{t.dueDate}</span>
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {(!localOps.tasks || localOps.tasks.length === 0) && (
          <button
            type="button"
            onClick={() => persistTasks(tasks)}
            className="mt-3 text-[0.65rem] tracking-[0.1em] text-accent uppercase hover:underline"
          >
            Save generated tasks to booking
          </button>
        )}
      </Panel>

      {/* 16. Activity Timeline */}
      <Panel title="Activity Timeline">
        <ol className="relative space-y-0 border-l border-stone/25 pl-4">
          {activity.map((e) => (
            <li key={e.id} className="relative pb-4">
              <span className="absolute -left-[1.15rem] top-1 h-2 w-2 rounded-full border border-accent bg-ink" />
              <p className="text-[0.55rem] tracking-[0.08em] text-muted uppercase">
                {new Date(e.at).toLocaleString()}
              </p>
              <p className="text-sm text-cream">{e.label}</p>
              {e.detail && <p className="text-xs text-fog">{e.detail}</p>}
            </li>
          ))}
          {activity.length === 0 && (
            <li className="text-sm text-muted">No activity yet.</li>
          )}
        </ol>
        <div className="mt-3 flex gap-2 border-t border-stone/20 pt-3">
          <input
            className="flex-1 border border-stone/30 bg-charcoal/30 px-2 py-1.5 text-sm text-cream"
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            placeholder="Log an update…"
            onKeyDown={(e) => {
              if (e.key === "Enter") void appendInternalLog();
            }}
          />
          <button
            type="button"
            onClick={() => void appendInternalLog()}
            className="border border-stone/40 px-3 text-xs text-fog uppercase"
          >
            Log
          </button>
        </div>
      </Panel>

      {/* Advanced ops — collapsed by default via details */}
      <details className="rounded-xl border border-stone/20 bg-charcoal/15">
        <summary className="cursor-pointer px-4 py-3 text-[0.65rem] tracking-[0.12em] text-muted uppercase">
          Advanced · Revenue, team, production checklists, portal
        </summary>
        <div className="space-y-4 border-t border-stone/20 px-4 py-4">
          <Panel title="Revenue · estimated">
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
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
              <Field label="Est. cost" value={revenue.format(revenue.productionCost)} />
              <Field label="Est. profit" value={revenue.format(revenue.profit)} />
              <Field label="Margin" value={`${revenue.margin}%`} />
            </dl>
          </Panel>

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
                      setLocalOps((prev) => ({
                        ...prev,
                        team: { ...(prev.team || {}), [key]: e.target.value },
                        assignedTo:
                          key === "leadPhotographer" ? e.target.value : prev.assignedTo,
                      }));
                    }}
                    onBlur={(e) => {
                      void saveOps({
                        ...localOps,
                        team: { ...(localOps.team || {}), [key]: e.target.value },
                        assignedTo:
                          key === "leadPhotographer" ? e.target.value : localOps.assignedTo,
                      });
                    }}
                    placeholder="Name"
                  />
                </label>
              ))}
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChecklistPanel
              title="Before shoot"
              items={PRE_SHOOT_CHECKLIST}
              checklist={localOps.checklist || {}}
              prefix="pre:"
              onToggle={(key, checked) => {
                void saveOps({
                  ...localOps,
                  checklist: { ...(localOps.checklist || {}), [key]: checked },
                });
              }}
            />
            <ChecklistPanel
              title="After shoot"
              items={POST_SHOOT_CHECKLIST}
              checklist={localOps.checklist || {}}
              prefix="post:"
              onToggle={(key, checked) => {
                void saveOps({
                  ...localOps,
                  checklist: { ...(localOps.checklist || {}), [key]: checked },
                });
              }}
            />
          </div>

          <Panel title="Client portal">
            <p className="text-sm text-fog">
              Gallery portal is not connected yet. Controls reserved for when client access ships.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 opacity-50">
              {["Enable Gallery", "Generate Access Code", "Allow Downloads"].map((label) => (
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

          <div className="flex flex-wrap gap-2">
            {!compact && (
              <Link
                href={`/admin/submissions?type=booking&focus=${submissionId}`}
                className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
              >
                Open in inbox
              </Link>
            )}
            <Link
              href="/admin/pipeline"
              className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
            >
              Pipeline
            </Link>
            <Link
              href="/admin/financial"
              className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
            >
              Financial
            </Link>
            <button
              type="button"
              onClick={() => onStatusChange?.("archived")}
              className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase"
            >
              Archive
            </button>
          </div>
        </div>
      </details>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 break-words text-cream">{value}</dd>
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
