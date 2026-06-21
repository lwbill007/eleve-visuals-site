"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";

interface Submission {
  id: string;
  type: string;
  data: Record<string, unknown>;
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

function BookingSubmissionDetail({ data }: { data: Record<string, unknown> }) {
  const deliverables = asStringArray(data.deliverables);

  return (
    <dl className="mt-4 grid gap-3 text-sm text-fog sm:grid-cols-2">
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted">Service</dt>
        <dd className="text-cream">{asString(data.serviceType) ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted">Shoot type</dt>
        <dd className="text-cream">{asString(data.shootType) ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted">Preferred date</dt>
        <dd className="text-cream">{asString(data.preferredDate) ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted">Alternate date</dt>
        <dd className="text-cream">{asString(data.alternateDate) ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted">Location</dt>
        <dd className="text-cream">{asString(data.location) ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted">Budget</dt>
        <dd className="text-cream">{asString(data.budgetRange) ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted">Phone</dt>
        <dd className="text-cream">{asString(data.phone) ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted">Instagram</dt>
        <dd className="text-cream">{asString(data.instagram) ?? "—"}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs uppercase tracking-wide text-muted">Project details</dt>
        <dd className="mt-1 whitespace-pre-wrap text-cream">
          {asString(data.projectDetails) ?? "—"}
        </dd>
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
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted">Subject</dt>
        <dd className="text-cream">{asString(data.subject) ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted">Email</dt>
        <dd className="text-cream">{asString(data.email) ?? "—"}</dd>
      </div>
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
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted">Role</dt>
        <dd className="text-cream">{asString(data.role) ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted">Experience</dt>
        <dd className="text-cream">{asString(data.experienceLevel) ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted">Phone</dt>
        <dd className="text-cream">{asString(data.phone) ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted">Instagram</dt>
        <dd className="text-cream">{asString(data.instagram) ?? "—"}</dd>
      </div>
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

export default function AdminSubmissionsClient() {
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get("type");
  const [items, setItems] = useState<Submission[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const url = typeFilter
      ? `/api/admin/submissions?type=${typeFilter}`
      : "/api/admin/submissions";
    const res = await adminFetch(url);
    if (res.ok) setItems(await res.json());
  }, [typeFilter]);

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
    if (type === "booking") return "Booking";
    if (type === "session") return "Session App";
    return "Contact";
  };

  return (
    <AdminShell title="Submissions">
      <div className="mb-6 flex gap-2">
        {["all", "booking", "session", "contact"].map((t) => (
          <a
            key={t}
            href={t === "all" ? "/admin/submissions" : `/admin/submissions?type=${t}`}
            className={`px-3 py-1.5 text-xs uppercase ${
              (t === "all" && !typeFilter) || typeFilter === t
                ? "bg-cream text-ink"
                : "border border-stone/50 text-fog"
            }`}
          >
            {t}
          </a>
        ))}
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
                  {!item.read && <span className="ml-2 text-accent">· New</span>}
                </p>
                <p className="text-xs text-muted">
                  {new Date(item.createdAt).toLocaleString()}
                  {typeof item.data.fullName === "string" && ` · ${item.data.fullName}`}
                  {typeof item.data.name === "string" && ` · ${item.data.name}`}
                  {typeof item.data.email === "string" && ` · ${item.data.email}`}
                  {item.type === "booking" && typeof item.data.serviceType === "string" &&
                    ` · ${item.data.serviceType}`}
                </p>
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
