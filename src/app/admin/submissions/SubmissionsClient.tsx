"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { TimeStamp } from "@/components/admin/TimeStamp";
import { useAdminToast } from "@/components/admin/AdminToast";
import {
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
  WorkspaceToolbar,
} from "@/components/admin/os/WorkspaceFrame";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  INQUIRY_STATUSES,
  INQUIRY_STATUS_LABELS,
  INQUIRY_STATUS_COLORS,
  normalizeInquiryStatus,
  type ApplicationStatus,
  type InquiryStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatInquiryId } from "@/lib/booking";
import { BookingProjectWorkspace } from "@/components/admin/ai/BookingProjectWorkspace";

interface Submission {
  id: string;
  type: string;
  data: Record<string, unknown>;
  status: string;
  notes: string;
  read: boolean;
  ipAddress?: string;
  userAgent?: string;
  returningContact?: boolean;
  contactSubmissionCount?: number;
  createdAt: string;
  updatedAt: string;
}

const TYPE_BADGE: Record<string, string> = {
  booking: "border-[#b8a88a]/40 bg-[#b8a88a]/15 text-[#d8c8a8]",
  contact: "border-blue-500/30 bg-blue-500/15 text-blue-300",
  session: "border-purple-500/30 bg-purple-500/15 text-purple-300",
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-cream">{value}</dd>
    </div>
  );
}

function BookingSubmissionDetail({ data }: { data: Record<string, unknown> }) {
  const serviceTypes = asStringArray(data.serviceTypes);
  const legacyService = asString(data.serviceType);
  const services =
    serviceTypes.length > 0 ? serviceTypes.join(", ") : legacyService;
  const deliverables = asStringArray(data.deliverables);
  const vision =
    asString(data.projectVision) ?? asString(data.projectDetails);

  return (
    <dl className="mt-4 grid gap-3 text-sm text-fog sm:grid-cols-2">
      <DetailRow label="Category" value={asString(data.projectCategory)} />
      <DetailRow label="Services" value={services} />
      <DetailRow label="Purpose" value={asString(data.purpose)} />
      <DetailRow label="Goals" value={asString(data.goals)} />
      <DetailRow label="Audience" value={asString(data.audience)} />
      <DetailRow label="Creative direction" value={asString(data.creativeDirection)} />
      <DetailRow label="Preferred date" value={asString(data.preferredDate)} />
      <DetailRow
        label="Flexible date"
        value={asString(data.flexibleDate) ?? asString(data.alternateDate)}
      />
      <DetailRow label="Location" value={asString(data.location)} />
      <DetailRow label="Session setting" value={asString(data.sessionSetting)} />
      <DetailRow label="Duration" value={asString(data.duration)} />
      <DetailRow label="Budget" value={asString(data.budgetRange)} />
      <DetailRow label="Timeline notes" value={asString(data.projectTimeline)} />
      <DetailRow label="Referral" value={asString(data.referralSource)} />
      <DetailRow label="Phone" value={asString(data.phone)} />
      <DetailRow label="Instagram" value={asString(data.instagram)} />
      <DetailRow label="Website" value={asString(data.website)} />
      <DetailRow label="Pinterest" value={asString(data.pinterestLink)} />
      <DetailRow label="Mood board" value={asString(data.moodBoardUrl)} />
      <DetailRow label="Inspiration IG" value={asString(data.inspirationInstagram)} />
      <DetailRow label="Drive link" value={asString(data.driveLink)} />
      <div className="sm:col-span-2">
        <dt className="text-xs uppercase tracking-wide text-muted">Story / vision</dt>
        <dd className="mt-1 whitespace-pre-wrap text-cream">{vision ?? "—"}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs uppercase tracking-wide text-muted">Deliverables</dt>
        <dd className="mt-1 text-cream">
          {deliverables.length > 0 ? deliverables.join(", ") : "—"}
        </dd>
      </div>
    </dl>
  );
}

function ContactSubmissionDetail({ data }: { data: Record<string, unknown> }) {
  return (
    <dl className="mt-4 grid gap-3 text-sm text-fog sm:grid-cols-2">
      <DetailRow label="Subject" value={asString(data.subject)} />
      <DetailRow label="Email" value={asString(data.email)} />
      <div className="sm:col-span-2">
        <dt className="text-xs uppercase tracking-wide text-muted">Message</dt>
        <dd className="mt-1 whitespace-pre-wrap text-cream">{asString(data.message) ?? "—"}</dd>
      </div>
    </dl>
  );
}

function SessionSubmissionDetail({ data }: { data: Record<string, unknown> }) {
  return (
    <dl className="mt-4 grid gap-3 text-sm text-fog sm:grid-cols-2">
      <DetailRow label="Volume" value={asString(data.sessionVolumeTitle)} />
      <DetailRow label="Role" value={asString(data.role)} />
      <DetailRow label="Experience" value={asString(data.experienceLevel)} />
      <DetailRow label="Phone" value={asString(data.phone)} />
      <DetailRow label="Instagram" value={asString(data.instagram)} />
      <div className="sm:col-span-2">
        <dt className="text-xs uppercase tracking-wide text-muted">Portfolio</dt>
        <dd className="text-cream break-all">{asString(data.portfolioLink) ?? "—"}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs uppercase tracking-wide text-muted">Why participate</dt>
        <dd className="mt-1 whitespace-pre-wrap text-cream">
          {asString(data.whyParticipate) ?? "—"}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs uppercase tracking-wide text-muted">Theme fit</dt>
        <dd className="mt-1 whitespace-pre-wrap text-cream">{asString(data.themeFit) ?? "—"}</dd>
      </div>
    </dl>
  );
}

function SubmissionDetail({ type, data }: { type: string; data: Record<string, unknown> }) {
  if (data._parseError) {
    return (
      <pre className="mt-4 overflow-x-auto border border-stone/20 bg-ink p-4 text-xs text-fog">
        {String(data._raw ?? "Invalid submission data")}
      </pre>
    );
  }
  if (type === "booking") return <BookingSubmissionDetail data={data} />;
  if (type === "contact") return <ContactSubmissionDetail data={data} />;
  if (type === "session") return <SessionSubmissionDetail data={data} />;
  return (
    <pre className="mt-4 overflow-x-auto border border-stone/20 bg-ink p-4 text-xs text-fog">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function exportCsv(items: Submission[], type: "booking" | "session" | "contact") {
  let header: string[] = [];
  let rows: string[][] = [];

  if (type === "booking") {
    header = ["Inquiry ID", "Submitted", "Status", "Name", "Email", "Phone", "Services", "Budget", "Date", "Location", "Vision", "Notes"];
    rows = items.filter((i) => i.type === "booking").map((item) => {
      const d = item.data;
      const services = asStringArray(d.serviceTypes).join("; ") || asString(d.serviceType) || "";
      return [
        formatInquiryId(item.id),
        item.createdAt,
        item.status,
        asString(d.fullName) ?? "",
        asString(d.email) ?? "",
        asString(d.phone) ?? "",
        services,
        asString(d.budgetRange) ?? "",
        asString(d.preferredDate) ?? "",
        asString(d.location) ?? "",
        (asString(d.projectVision) ?? asString(d.projectDetails) ?? "").replace(/\n/g, " "),
        item.notes,
      ];
    });
  } else if (type === "session") {
    header = ["ID", "Submitted", "Status", "Name", "Email", "Volume", "Role", "Instagram", "Notes"];
    rows = items.filter((i) => i.type === "session").map((item) => {
      const d = item.data;
      return [
        item.id,
        item.createdAt,
        item.status,
        asString(d.fullName) ?? asString(d.name) ?? "",
        asString(d.email) ?? "",
        asString(d.sessionVolumeTitle) ?? "",
        asString(d.role) ?? "",
        asString(d.instagram) ?? "",
        item.notes,
      ];
    });
  } else {
    header = ["ID", "Submitted", "Status", "Name", "Email", "Subject", "Message", "Notes"];
    rows = items.filter((i) => i.type === "contact").map((item) => {
      const d = item.data;
      return [
        item.id,
        item.createdAt,
        item.status,
        asString(d.name) ?? "",
        asString(d.email) ?? "",
        asString(d.subject) ?? "",
        (asString(d.message) ?? "").replace(/\n/g, " "),
        item.notes,
      ];
    });
  }

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `eleve-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminSubmissionsClient({ forcedType }: { forcedType?: "booking" | "session" | "contact" } = {}) {
  const searchParams = useSearchParams();
  const typeFilter = forcedType ?? searchParams.get("type");
  const statusFilter = searchParams.get("status");
  const focusId = searchParams.get("focus");
  const { toast } = useAdminToast();
  const [items, setItems] = useState<Submission[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const focusHandled = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());
      const qs = params.toString();
      const url = qs ? `/api/admin/submissions?${qs}` : "/api/admin/submissions";
      const res = await adminFetch(url);
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as Submission[];
      setItems(data);
      setNoteDrafts(
        Object.fromEntries(data.map((item) => [item.id, item.notes || ""]))
      );
    } catch {
      setError("Could not load submissions.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  useEffect(() => {
    if (!focusId || focusHandled.current) return;
    const target = items.find((i) => i.id === focusId);
    if (!target) return;
    focusHandled.current = true;
    setExpanded(focusId);
    if (!target.read) void markRead(focusId, true);
    requestAnimationFrame(() => {
      document
        .getElementById(`submission-${focusId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, focusId]);

  async function markRead(id: string, read: boolean) {
    const res = await adminFetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read }),
    });
    if (res.ok) load();
    else toast("Could not update read state.", "error");
  }

  async function updateStatus(id: string, status: InquiryStatus | ApplicationStatus) {
    const res = await adminFetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      toast("Status updated.");
      load();
    } else {
      toast("Status update failed.", "error");
    }
  }

  async function saveNotes(id: string) {
    const res = await adminFetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notes: noteDrafts[id] ?? "" }),
    });
    if (res.ok) toast("Notes saved.");
    else toast("Could not save notes.", "error");
  }

  async function remove(id: string) {
    if (!confirm("Delete this submission permanently?")) return;
    const res = await adminFetch("/api/admin/submissions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast("Submission deleted.");
      load();
    } else {
      toast("Delete failed.", "error");
    }
  }

  async function toggleExpanded(item: Submission) {
    const next = expanded === item.id ? null : item.id;
    setExpanded(next);
    if (next && !item.read) {
      await markRead(item.id, true);
    }
  }

  const typeLabel = (type: string) => {
    if (type === "booking") return "Inquiry";
    if (type === "session") return "Session App";
    return "Contact";
  };

  const bookingSummary = (data: Record<string, unknown>) => {
    const services = asStringArray(data.serviceTypes);
    if (services.length > 0) return services.join(", ");
    return asString(data.serviceType);
  };

  const pageTitle =
    typeFilter === "booking"
      ? "Booking CRM"
      : typeFilter === "session"
        ? "Session Applications"
        : typeFilter === "contact"
          ? "Contact Messages"
          : "All Submissions";

  const chromeTitle =
    typeFilter === "booking"
      ? "Bookings"
      : typeFilter === "session"
        ? "Session Applications"
        : typeFilter === "contact"
          ? "Contact Messages"
          : "Inbox";

  const chromeEyebrow =
    typeFilter === "booking" ? "Work · Bookings" : "Work · Inbox";

  const chromeDescription =
    typeFilter === "booking"
      ? "What: booking inquiries and CRM statuses. Why: speed-to-lead converts. Next: open unread, update status, add notes. AI can draft follow-ups from the inquiry."
      : "What: every form response in one inbox. Why: nothing falls through. Next: triage unread and update status. AI can summarize threads and draft replies.";

  return (
    <AdminShell title={pageTitle}>
      <WorkspaceChrome
        eyebrow={chromeEyebrow}
        title={chromeTitle}
        description={chromeDescription}
        onRefresh={() => void load()}
        refreshing={loading}
        related={[
          { label: "Workboard", href: "/admin/workboard", desc: "Stale first" },
          { label: "Pipeline", href: "/admin/pipeline", desc: "Deals" },
          { label: "CRM", href: "/admin/crm", desc: "People" },
          { label: "Email", href: "/admin/email", desc: "Send" },
        ]}
      >
      <WorkspaceToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search name, email, message..."
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {!forcedType &&
          ["all", "booking", "session", "contact"].map((t) => (
          <a
            key={t}
            href={
              t === "all"
                ? `/admin/submissions${statusFilter ? `?status=${statusFilter}` : ""}`
                : `/admin/submissions?type=${t}${statusFilter ? `&status=${statusFilter}` : ""}`
            }
            className={`px-3 py-1.5 text-xs uppercase ${
              (t === "all" && !typeFilter) || typeFilter === t
                ? "bg-cream text-ink"
                : "border border-stone/50 text-fog"
            }`}
          >
            {t === "booking" ? "inquiries" : t}
          </a>
        ))}
        {(!forcedType && (typeFilter === "booking" || typeFilter === "contact" || !typeFilter)) && (
          <>
            <span className="mx-1 text-stone/50">|</span>
            {["all", ...INQUIRY_STATUSES].map((s) => (
              <a
                key={s}
                href={
                  s === "all"
                    ? `/admin/submissions${typeFilter ? `?type=${typeFilter}` : ""}`
                    : `/admin/submissions?${typeFilter ? `type=${typeFilter}&` : ""}status=${s}`
                }
                className={`px-3 py-1.5 text-xs uppercase ${
                  (s === "all" && !statusFilter) || statusFilter === s
                    ? "border border-accent/50 text-accent"
                    : "border border-stone/50 text-fog"
                }`}
              >
                {s === "all" ? "all status" : INQUIRY_STATUS_LABELS[s as InquiryStatus]}
              </a>
            ))}
          </>
        )}
        {(typeFilter === "session" || forcedType === "session") && (
          <>
            <span className="mx-1 text-stone/50">|</span>
            {["all", ...APPLICATION_STATUSES].map((s) => (
              <a
                key={s}
                href={
                  s === "all"
                    ? `/admin/applications`
                    : `/admin/applications?status=${s}`
                }
                className={`px-3 py-1.5 text-xs uppercase ${
                  (s === "all" && !statusFilter) || statusFilter === s
                    ? "border border-accent/50 text-accent"
                    : "border border-stone/50 text-fog"
                }`}
              >
                {s === "all" ? "all status" : APPLICATION_STATUS_LABELS[s as ApplicationStatus]}
              </a>
            ))}
          </>
        )}
        {(typeFilter === "booking" || typeFilter === "contact" || typeFilter === "session") && items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              exportCsv(
                items,
                typeFilter === "session"
                  ? "session"
                  : typeFilter === "contact"
                    ? "contact"
                    : "booking"
              );
            }}
            className="ml-auto border border-stone/50 px-3 py-1.5 text-xs text-fog uppercase hover:border-cream/40"
          >
            Export CSV
          </button>
        )}
      </div>

      {loading && items.length === 0 ? (
        <WorkspaceLoading rows={4} />
      ) : error && items.length === 0 ? (
        <WorkspaceError message={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <WorkspaceEmpty
          title="No submissions yet"
          detail="Form responses appear here as they arrive. Check Forms hub if intake looks empty."
          actionHref="/admin/forms"
          actionLabel="Open forms hub"
        />
      ) : (
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            id={`submission-${item.id}`}
            className={`border p-4 ${
              focusId === item.id
                ? "border-accent ring-1 ring-accent/40"
                : item.read
                  ? "border-stone/30"
                  : "border-accent/40 bg-charcoal/30"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm text-cream">
                  <span
                    className={`inline-block rounded border px-2 py-0.5 text-[0.65rem] uppercase tracking-wide ${
                      TYPE_BADGE[item.type] || "border-stone/40 bg-stone/20 text-fog"
                    }`}
                  >
                    {typeLabel(item.type)}
                  </span>
                  {item.type === "booking" && (
                    <span className="text-xs text-muted">#{formatInquiryId(item.id)}</span>
                  )}
                  {item.returningContact && (
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[0.65rem] text-amber-300">
                      Returning{item.contactSubmissionCount ? ` ×${item.contactSubmissionCount}` : ""}
                    </span>
                  )}
                  {!item.read && <span className="text-accent">· Unread</span>}
                </p>
                <p className="text-xs break-words text-muted">
                  <TimeStamp iso={item.createdAt} />
                  {typeof item.data.fullName === "string" && ` · ${item.data.fullName}`}
                  {typeof item.data.name === "string" && ` · ${item.data.name}`}
                  {typeof item.data.email === "string" && ` · ${item.data.email}`}
                  {item.type === "booking" && bookingSummary(item.data) &&
                    ` · ${bookingSummary(item.data)}`}
                  {item.type === "booking" && typeof item.data.budgetRange === "string" &&
                    ` · ${item.data.budgetRange}`}
                </p>
                {(item.type === "booking" || item.type === "contact") && (
                  <select
                    value={normalizeInquiryStatus(item.status)}
                    onChange={(e) => updateStatus(item.id, e.target.value as InquiryStatus)}
                    className={cn(
                      "mt-2 border bg-charcoal px-2 py-1 text-xs",
                      INQUIRY_STATUS_COLORS[normalizeInquiryStatus(item.status)] ||
                        "border-stone/50 text-cream"
                    )}
                    aria-label="Inquiry status"
                  >
                    {INQUIRY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {INQUIRY_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                )}
                {item.type === "session" && (
                  <select
                    value={item.status}
                    onChange={(e) => updateStatus(item.id, e.target.value as ApplicationStatus)}
                    className={cn(
                      "mt-2 border bg-charcoal px-2 py-1 text-xs",
                      APPLICATION_STATUS_COLORS[item.status as ApplicationStatus] ||
                        "border-stone/50 text-cream"
                    )}
                    aria-label="Application status"
                  >
                    {APPLICATION_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {APPLICATION_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-stone/20 pt-3 sm:shrink-0 sm:border-0 sm:pt-0">
                <button
                  type="button"
                  onClick={() => toggleExpanded(item)}
                  className="inline-flex min-h-9 items-center text-xs text-accent"
                >
                  {expanded === item.id ? "Hide" : "View"}
                </button>
                {!item.read && (
                  <button
                    type="button"
                    onClick={() => markRead(item.id, true)}
                    className="inline-flex min-h-9 items-center text-xs text-fog"
                  >
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="inline-flex min-h-9 items-center text-xs text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
            {expanded === item.id && (
              <>
                <SubmissionDetail type={item.type} data={item.data} />
                {item.type === "booking" && (
                  <BookingProjectWorkspace
                    submissionId={item.id}
                    status={item.status}
                    data={item.data}
                    email={
                      (typeof item.data.email === "string" && item.data.email) ||
                      undefined
                    }
                  />
                )}
                <div className="mt-4 border-t border-stone/20 pt-4 text-xs text-muted">
                  <p>
                    <span className="uppercase tracking-wide">Received</span>{" "}
                    <TimeStamp iso={item.createdAt} showUtc className="text-fog" />
                  </p>
                  {(item.ipAddress || item.userAgent) && (
                    <p className="mt-1 break-all">
                      <span className="uppercase tracking-wide">Spam review</span>{" "}
                      <span className="text-fog">
                        IP {item.ipAddress || "unknown"}
                        {item.userAgent ? ` · ${item.userAgent}` : ""}
                      </span>
                    </p>
                  )}
                </div>
                <div className="mt-4 border-t border-stone/20 pt-4">
                  <label className="mb-2 block text-xs tracking-wide text-muted uppercase">
                    Internal notes
                  </label>
                  <textarea
                    value={noteDrafts[item.id] ?? ""}
                    onChange={(e) =>
                      setNoteDrafts({ ...noteDrafts, [item.id]: e.target.value })
                    }
                    rows={3}
                    className="w-full border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
                    placeholder="Private notes — not visible to client"
                  />
                  <button
                    type="button"
                    onClick={() => saveNotes(item.id)}
                    className="mt-2 border border-stone/50 px-3 py-1.5 text-xs text-fog uppercase hover:text-cream"
                  >
                    Save notes
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      )}
      </WorkspaceChrome>
    </AdminShell>
  );
}
