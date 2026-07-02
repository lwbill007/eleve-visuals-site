"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { TimeStamp } from "@/components/admin/TimeStamp";
import { useAdminToast } from "@/components/admin/AdminToast";
import { AdminListSkeleton } from "@/components/admin/AdminPageSkeleton";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
  SESSION_APPLICATION_ROLES,
  type ApplicationStatus,
  type SessionVolumeDTO,
} from "@/lib/types";
import { formatApplicationId } from "@/lib/session-application";
import { cn } from "@/lib/utils";

interface ApplicationRow {
  id: string;
  data: Record<string, unknown>;
  status: ApplicationStatus;
  notes: string;
  read: boolean;
  starred: boolean;
  sessionVolumeId: string | null;
  ipAddress?: string;
  userAgent?: string;
  returningContact?: boolean;
  contactSubmissionCount?: number;
  createdAt: string;
}

interface ApplicationStats {
  totalApplications: number;
  byRole: Record<string, number>;
  acceptanceRate: number;
  waitlistCount: number;
  acceptedCount: number;
  remainingSpots: number | null;
  dailyTrend: { date: string; count: number }[];
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function getRoles(data: Record<string, unknown>): string[] {
  if (Array.isArray(data.roles)) return data.roles.filter((r): r is string => typeof r === "string");
  const role = asString(data.role);
  return role ? [role] : [];
}

export default function ApplicationsClient() {
  const searchParams = useSearchParams();
  const { toast } = useAdminToast();
  const [items, setItems] = useState<ApplicationRow[]>([]);
  const [volumes, setVolumes] = useState<SessionVolumeDTO[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [volumeFilter, setVolumeFilter] = useState(searchParams.get("volumeId") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [roleFilter, setRoleFilter] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const focusId = searchParams.get("focus");
  const focusHandled = useRef(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ type: "session" });
    if (statusFilter) params.set("status", statusFilter);
    if (volumeFilter) params.set("volumeId", volumeFilter);
    if (search.trim()) params.set("q", search.trim());
    if (roleFilter) params.set("role", roleFilter);

    const [listRes, statsRes] = await Promise.all([
      adminFetch(`/api/admin/submissions?${params}`),
      adminFetch(
        `/api/admin/applications/stats${volumeFilter ? `?volumeId=${volumeFilter}` : ""}`
      ),
    ]);

    if (listRes.ok) {
      const data = (await listRes.json()) as ApplicationRow[];
      setItems(data);
      setNoteDrafts(Object.fromEntries(data.map((r) => [r.id, r.notes || ""])));
    }
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }, [search, statusFilter, volumeFilter, roleFilter]);

  useEffect(() => {
    adminFetch("/api/admin/session-volumes")
      .then((r) => (r.ok ? r.json() : []))
      .then(setVolumes);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  useEffect(() => {
    if (!focusId || focusHandled.current) return;
    const target = items.find((i) => i.id === focusId);
    if (!target) return;
    focusHandled.current = true;
    setExpanded(focusId);
    if (!target.read) void updateRow(focusId, { read: true });
    requestAnimationFrame(() => {
      document
        .getElementById(`application-${focusId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, focusId]);

  async function updateRow(id: string, patch: Record<string, unknown>) {
    const res = await adminFetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (res.ok) load();
    else toast("Update failed.", "error");
  }

  async function bulkStatus(status: ApplicationStatus) {
    if (selected.size === 0) return;
    const res = await adminFetch("/api/admin/applications/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], status }),
    });
    if (res.ok) {
      toast(`Updated ${selected.size} applications.`);
      setSelected(new Set());
      load();
    } else toast("Bulk update failed.", "error");
  }

  function exportCsv() {
    const header = ["ID", "Date", "Status", "Name", "Email", "Volume", "Roles", "Instagram", "Portfolio", "Notes"];
    const rows = items.map((item) => {
      const d = item.data;
      return [
        item.id,
        item.createdAt,
        item.status,
        asString(d.fullName) || asString(d.name),
        asString(d.email),
        asString(d.sessionVolumeTitle),
        getRoles(d).join("; "),
        asString(d.instagram),
        asString(d.portfolioLink),
        item.notes,
      ];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eleve-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const maxTrend = Math.max(...(stats?.dailyTrend.map((d) => d.count) ?? [1]), 1);

  return (
    <AdminShell title="Session Applications">
      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-stone/30 p-4">
            <p className="text-xs text-muted uppercase">Total applications</p>
            <p className="mt-2 font-display text-3xl text-cream">{stats.totalApplications}</p>
          </div>
          <div className="border border-stone/30 p-4">
            <p className="text-xs text-muted uppercase">Acceptance rate</p>
            <p className="mt-2 font-display text-3xl text-cream">{stats.acceptanceRate}%</p>
          </div>
          <div className="border border-stone/30 p-4">
            <p className="text-xs text-muted uppercase">Waitlisted</p>
            <p className="mt-2 font-display text-3xl text-cream">{stats.waitlistCount}</p>
          </div>
          <div className="border border-stone/30 p-4">
            <p className="text-xs text-muted uppercase">Remaining spots</p>
            <p className="mt-2 font-display text-3xl text-cream">
              {stats.remainingSpots ?? "—"}
            </p>
          </div>
        </div>
      )}

      {stats && stats.dailyTrend.length > 0 && (
        <div className="mb-8 border border-stone/30 p-4">
          <p className="mb-4 text-xs text-muted uppercase">Daily applications (14 days)</p>
          <div className="flex h-24 items-end gap-1">
            {stats.dailyTrend.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full bg-accent/70"
                  style={{ height: `${Math.max((d.count / maxTrend) * 100, 4)}%` }}
                  title={`${d.date}: ${d.count}`}
                />
                <span className="text-[0.55rem] text-muted">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] xl:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search applicants..."
          className="w-full border border-stone/50 bg-charcoal px-4 py-2.5 text-sm text-cream sm:col-span-2 xl:col-span-1"
        />
        <select
          value={volumeFilter}
          onChange={(e) => setVolumeFilter(e.target.value)}
          className="w-full border border-stone/50 bg-charcoal px-3 py-2.5 text-sm text-cream"
        >
          <option value="">All sessions</option>
          {volumes.map((v) => (
            <option key={v.id} value={v.id}>
              Vol. {v.volumeNumber} — {v.title}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full border border-stone/50 bg-charcoal px-3 py-2.5 text-sm text-cream"
        >
          <option value="">All roles</option>
          {SESSION_APPLICATION_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full border border-stone/50 bg-charcoal px-3 py-2.5 text-sm text-cream"
        >
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPLICATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={exportCsv}
          className="w-full border border-stone/50 px-3 py-2.5 text-xs text-fog uppercase sm:col-span-2 xl:col-span-1"
        >
          Export CSV
        </button>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 border border-accent/30 bg-charcoal/30 p-3">
          <span className="text-xs text-fog">{selected.size} selected</span>
          {(["shortlisted", "accepted", "waitlisted", "declined"] as ApplicationStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void bulkStatus(s)}
              className="inline-flex min-h-9 items-center border border-stone/50 px-3 py-1.5 text-xs text-fog uppercase hover:text-cream"
            >
              Mark {APPLICATION_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <AdminListSkeleton count={6} />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const d = item.data;
            const roles = getRoles(d);
            const portfolioImages = Array.isArray(d.portfolioImages)
              ? (d.portfolioImages as unknown[]).filter((x): x is string => typeof x === "string")
              : [];
            const photo = portfolioImages[0];
            const bio = asString(d.whyParticipate) || asString(d.themeFit) || asString(d.bio);
            const displayName = asString(d.fullName) || asString(d.name) || "Applicant";
            return (
              <div
                key={item.id}
                id={`application-${item.id}`}
                className={cn(
                  "w-full max-w-full overflow-hidden border p-4 sm:p-5",
                  focusId === item.id
                    ? "border-accent ring-1 ring-accent/40"
                    : item.read
                      ? "border-stone/30"
                      : "border-accent/40 bg-charcoal/20",
                  item.starred && !focusId && "ring-1 ring-accent/30"
                )}
              >
                {/* Flex layout avoids grid minmax(0,fr) columns collapsing to zero width. */}
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-5">
                  {/* Photo + select */}
                  <div className="flex shrink-0 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(item.id);
                        else next.delete(item.id);
                        setSelected(next);
                      }}
                      className="mt-1.5"
                      aria-label={`Select ${displayName}`}
                    />
                    <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded bg-charcoal sm:w-20">
                      {photo ? (
                        <Image src={photo} alt="" fill className="object-cover" sizes="80px" />
                      ) : (
                        <div className="flex h-full items-center justify-center px-1 text-center text-[9px] text-muted">
                          No photo
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Applicant info + roles */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium break-words text-cream">{displayName}</p>
                      <span className="text-xs text-muted">#{formatApplicationId(item.id)}</span>
                      {item.returningContact && (
                        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[0.65rem] text-amber-300">
                          Returning{item.contactSubmissionCount ? ` ×${item.contactSubmissionCount}` : ""}
                        </span>
                      )}
                      {!item.read && <span className="text-xs text-accent">Unread</span>}
                    </div>
                    <p className="text-xs break-words text-muted">
                      <TimeStamp iso={item.createdAt} />
                      {asString(d.sessionVolumeTitle) && ` · ${asString(d.sessionVolumeTitle)}`}
                    </p>
                    {roles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {roles.map((r) => (
                          <span
                            key={r}
                            className="rounded-full border border-stone/40 px-2.5 py-0.5 text-[0.65rem] tracking-wide text-fog uppercase"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bio — hidden on small screens when empty; full column on xl */}
                  <div className="min-w-0 xl:flex-[1.25] xl:basis-0">
                    {bio ? (
                      <p className="line-clamp-3 text-sm break-words text-fog xl:line-clamp-4">{bio}</p>
                    ) : (
                      <p className="hidden text-sm text-muted/60 italic xl:block">No statement provided</p>
                    )}
                  </div>

                  {/* Status + actions */}
                  <div className="flex w-full shrink-0 flex-col gap-3 border-t border-stone/20 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between xl:w-44 xl:flex-col xl:items-stretch xl:justify-start xl:border-0 xl:pt-0">
                    <select
                      value={item.status}
                      onChange={(e) => updateRow(item.id, { status: e.target.value })}
                      className={cn(
                        "w-full border bg-charcoal px-2 py-2 text-xs sm:max-w-xs xl:max-w-none",
                        APPLICATION_STATUS_COLORS[item.status]
                      )}
                      aria-label="Application status"
                    >
                      {APPLICATION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {APPLICATION_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <button
                        type="button"
                        onClick={() => updateRow(item.id, { starred: !item.starred })}
                        className={cn("inline-flex min-h-9 items-center text-sm", item.starred ? "text-accent" : "text-fog")}
                        aria-label={item.starred ? "Unstar" : "Star"}
                      >
                        {item.starred ? "★ Starred" : "☆ Star"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = expanded === item.id ? null : item.id;
                          setExpanded(next);
                          if (next && !item.read) {
                            void updateRow(item.id, { read: true });
                          }
                        }}
                        className="inline-flex min-h-9 items-center text-xs text-accent"
                      >
                        {expanded === item.id ? "Hide" : "View"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Delete this application?")) {
                            void adminFetch("/api/admin/submissions", {
                              method: "DELETE",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: item.id }),
                            }).then(() => load());
                          }
                        }}
                        className="inline-flex min-h-9 items-center text-xs text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {expanded === item.id && (
                  <div className="mt-6 border-t border-stone/20 pt-4">
                    <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
                      <div className="min-w-0"><dt className="text-xs text-muted uppercase">Email</dt><dd className="break-all text-cream">{asString(d.email)}</dd></div>
                      <div className="min-w-0"><dt className="text-xs text-muted uppercase">Phone</dt><dd className="break-words text-cream">{asString(d.phone)}</dd></div>
                      <div className="min-w-0"><dt className="text-xs text-muted uppercase">Instagram</dt><dd className="break-words text-cream">{asString(d.instagram)}</dd></div>
                      <div className="min-w-0"><dt className="text-xs text-muted uppercase">City</dt><dd className="break-words text-cream">{asString(d.cityState)}</dd></div>
                      <div className="sm:col-span-2"><dt className="text-xs text-muted uppercase">Portfolio</dt><dd className="break-all text-cream">{asString(d.portfolioLink) || asString(d.portfolioWebsite) || "—"}</dd></div>
                    </dl>
                    <div className="mt-4 border-t border-stone/20 pt-3 text-xs text-muted">
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
                    {Array.isArray(d.portfolioImages) && (d.portfolioImages as string[]).length > 0 && (
                      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {(d.portfolioImages as string[]).map((url) => (
                          <div key={url} className="relative aspect-square border border-stone/30">
                            <Image src={url} alt="" fill className="object-cover" sizes="80px" />
                          </div>
                        ))}
                      </div>
                    )}
                    {Array.isArray(d.questionAnswers) &&
                      (d.questionAnswers as { question: string; answer: string }[]).map((q) => (
                        <div key={q.question} className="mt-4">
                          <p className="text-xs text-muted uppercase">{q.question}</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-fog">{q.answer || "—"}</p>
                        </div>
                      ))}
                    <div className="mt-6">
                      <label className="mb-2 block text-xs text-muted uppercase">Private notes</label>
                      <textarea
                        value={noteDrafts[item.id] ?? ""}
                        onChange={(e) => setNoteDrafts({ ...noteDrafts, [item.id]: e.target.value })}
                        rows={3}
                        className="w-full border border-stone/40 bg-charcoal px-3 py-2 text-sm text-cream"
                      />
                      <button
                        type="button"
                        onClick={() => updateRow(item.id, { notes: noteDrafts[item.id] })}
                        className="admin-touch-btn-compact mt-2 border border-stone/50 text-fog uppercase"
                      >
                        Save notes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="py-16 text-center text-fog">No applications yet.</p>
          )}
        </div>
      )}
    </AdminShell>
  );
}
