"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  INQUIRY_STATUSES,
  INQUIRY_STATUS_LABELS,
  type InquiryStatus,
} from "@/lib/types";
import { formatInquiryId } from "@/lib/booking";

interface Submission {
  id: string;
  type: string;
  data: Record<string, unknown>;
  status: string;
  read: boolean;
  createdAt: string;
}

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
      <DetailRow label="Services" value={services} />
      <DetailRow label="Shoot type (legacy)" value={asString(data.shootType)} />
      <DetailRow label="Preferred date" value={asString(data.preferredDate)} />
      <DetailRow
        label="Flexible date"
        value={asString(data.flexibleDate) ?? asString(data.alternateDate)}
      />
      <DetailRow label="Location" value={asString(data.location)} />
      <DetailRow label="Session setting" value={asString(data.sessionSetting)} />
      <DetailRow label="Duration" value={asString(data.duration)} />
      <DetailRow label="Budget" value={asString(data.budgetRange)} />
      <DetailRow label="Referral" value={asString(data.referralSource)} />
      <DetailRow label="Phone" value={asString(data.phone)} />
      <DetailRow label="Instagram" value={asString(data.instagram)} />
      <DetailRow label="Website" value={asString(data.website)} />
      <DetailRow label="Pinterest" value={asString(data.pinterestLink)} />
      <DetailRow label="Mood board" value={asString(data.moodBoardUrl)} />
      <DetailRow label="Inspiration IG" value={asString(data.inspirationInstagram)} />
      <DetailRow label="Drive link" value={asString(data.driveLink)} />
      <div className="sm:col-span-2">
        <dt className="text-xs uppercase tracking-wide text-muted">Project vision</dt>
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

function exportBookingsCsv(items: Submission[]) {
  const rows = items
    .filter((i) => i.type === "booking")
    .map((item) => {
      const d = item.data;
      const services = asStringArray(d.serviceTypes).join("; ") || asString(d.serviceType) || "";
      return [
        item.id,
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
      ];
    });

  const header = [
    "Inquiry ID",
    "Submitted",
    "Status",
    "Name",
    "Email",
    "Phone",
    "Services",
    "Budget",
    "Preferred Date",
    "Location",
    "Vision",
  ];

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `eleve-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminSubmissionsClient() {
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get("type");
  const statusFilter = searchParams.get("status");
  const [items, setItems] = useState<Submission[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    const qs = params.toString();
    const url = qs ? `/api/admin/submissions?${qs}` : "/api/admin/submissions";
    const res = await adminFetch(url);
    if (res.ok) setItems(await res.json());
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(id: string, read: boolean) {
    const res = await adminFetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read }),
    });
    if (res.ok) load();
  }

  async function updateStatus(id: string, status: InquiryStatus) {
    const res = await adminFetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this submission?")) return;
    const res = await adminFetch("/api/admin/submissions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
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

  return (
    <AdminShell title="Submissions">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {["all", "booking", "session", "contact"].map((t) => (
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
        {(!typeFilter || typeFilter === "booking") && (
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
        {items.some((i) => i.type === "booking") && (
          <button
            type="button"
            onClick={() => exportBookingsCsv(items)}
            className="ml-auto border border-stone/50 px-3 py-1.5 text-xs text-fog uppercase hover:border-cream/40"
          >
            Export CSV
          </button>
        )}
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`border p-4 ${item.read ? "border-stone/30" : "border-accent/40 bg-charcoal/30"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-cream">
                  {typeLabel(item.type)}
                  {item.type === "booking" && (
                    <span className="ml-2 text-xs text-muted">
                      #{formatInquiryId(item.id)}
                    </span>
                  )}
                  {!item.read && <span className="ml-2 text-accent">· Unread</span>}
                </p>
                <p className="text-xs text-muted">
                  {new Date(item.createdAt).toLocaleString()}
                  {typeof item.data.fullName === "string" && ` · ${item.data.fullName}`}
                  {typeof item.data.name === "string" && ` · ${item.data.name}`}
                  {typeof item.data.email === "string" && ` · ${item.data.email}`}
                  {item.type === "booking" && bookingSummary(item.data) &&
                    ` · ${bookingSummary(item.data)}`}
                  {item.type === "booking" && typeof item.data.budgetRange === "string" &&
                    ` · ${item.data.budgetRange}`}
                </p>
                {item.type === "booking" && (
                  <select
                    value={item.status}
                    onChange={(e) => updateStatus(item.id, e.target.value as InquiryStatus)}
                    className="mt-2 border border-stone/50 bg-charcoal px-2 py-1 text-xs text-cream"
                    aria-label="Inquiry status"
                  >
                    {INQUIRY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {INQUIRY_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => toggleExpanded(item)}
                  className="text-xs text-accent"
                >
                  {expanded === item.id ? "Hide" : "View"}
                </button>
                {!item.read && (
                  <button
                    type="button"
                    onClick={() => markRead(item.id, true)}
                    className="text-xs text-fog"
                  >
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="text-xs text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
            {expanded === item.id && (
              <SubmissionDetail type={item.type} data={item.data} />
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-12 text-center text-fog">No submissions yet.</p>
        )}
      </div>
    </AdminShell>
  );
}
