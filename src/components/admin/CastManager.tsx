"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminField, AdminInput, AdminTextarea, ImageUpload, GalleryUpload } from "./AdminForm";
import { CAST_ROLE_LABELS, CAST_STATUS_LABELS, castDisplayName, slugifyName } from "@/lib/cast";
import {
  CAST_ROLES,
  CAST_STATUSES,
  type CastAward,
  type CastMemberDTO,
  type CastRole,
  type CastStatus,
} from "@/lib/types";

const AWARD_ICONS = ["award", "star", "gem", "sparkle", "film", "camera", "tag"] as const;

function emptyMember(): Partial<CastMemberDTO> {
  return {
    fullName: "",
    stageName: "",
    role: "model",
    profilePhoto: null,
    additionalPhotos: [],
    bio: "",
    instagram: "",
    tiktok: "",
    website: "",
    portfolioLink: "",
    city: "",
    status: "confirmed",
    featured: false,
    isAlumni: false,
    featuredAlumni: false,
    notes: "",
    futureCollaborations: "",
    enableProfile: false,
    awards: [],
  };
}

export function CastManager({ volumeId }: { volumeId: string }) {
  const [members, setMembers] = useState<CastMemberDTO[]>([]);
  const [editing, setEditing] = useState<Partial<CastMemberDTO> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const dragIndex = useRef<number | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch(`/api/admin/session-volumes/${volumeId}/cast`);
    if (res.ok) setMembers(await res.json());
  }, [volumeId]);

  useEffect(() => {
    load();
  }, [load]);

  function set<K extends keyof CastMemberDTO>(key: K, value: CastMemberDTO[K]) {
    if (!editing) return;
    const next = { ...editing, [key]: value };
    if (key === "status") {
      const status = value as CastStatus;
      if (status === "alumni") next.isAlumni = true;
      if (status !== "alumni" && editing.status === "alumni") next.isAlumni = false;
    }
    if (key === "isAlumni") {
      if (value) next.status = "alumni";
      else if (editing.status === "alumni") next.status = "confirmed";
    }
    if (key === "fullName" && !editing.id && !editing.slug) {
      next.slug = slugifyName(String(value));
    }
    setEditing(next);
  }

  async function saveMember() {
    if (!editing?.fullName?.trim()) {
      setMsg("Full name is required.");
      return;
    }
    setSaving(true);
    setMsg("");
    const isNew = !editing.id;
    const url = isNew ? `/api/admin/session-volumes/${volumeId}/cast` : `/api/admin/cast/${editing.id}`;
    const res = await adminFetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      setEditing(null);
      await load();
      setMsg("Cast member saved.");
    } else {
      setMsg("Save failed.");
    }
    setSaving(false);
  }

  async function removeMember(id: string) {
    if (!confirm("Remove this cast member?")) return;
    const res = await adminFetch(`/api/admin/cast/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function persistOrder(next: CastMemberDTO[]) {
    setMembers(next);
    await adminFetch(`/api/admin/session-volumes/${volumeId}/cast`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((m) => m.id) }),
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= members.length) return;
    const next = [...members];
    [next[index], next[target]] = [next[target], next[index]];
    persistOrder(next);
  }

  function onDrop(index: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === index) return;
    const next = [...members];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    persistOrder(next);
  }

  const awards = editing?.awards ?? [];
  function setAward(i: number, patch: Partial<CastAward>) {
    const next = awards.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
    set("awards", next);
  }

  return (
    <div className="md:col-span-2 border-t border-stone/30 pt-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg">Cast & Crew</h3>
          <p className="text-xs text-muted">Drag to reorder. Confirmed &amp; Alumni show publicly; Pending stays hidden.</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(emptyMember())}
            className="admin-touch-btn-compact shrink-0 border border-cream/40 text-cream uppercase"
          >
            Add member
          </button>
        )}
      </div>

      {!editing && (
        <div className="space-y-2">
          {members.map((m, index) => (
            <div
              key={m.id}
              draggable
              onDragStart={() => (dragIndex.current = index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(index)}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 border border-stone/30 bg-charcoal/40 p-3"
            >
              <span className="cursor-grab text-fog" aria-hidden>⠿</span>
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-charcoal">
                {m.profilePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.profilePhoto} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-[9px] text-muted">No photo</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-cream">{castDisplayName(m)}</p>
                <p className="text-xs break-words text-muted">
                  {CAST_ROLE_LABELS[m.role]} · {CAST_STATUS_LABELS[m.status]}
                  {m.enableProfile && " · Profile live"}
                  {m.featured && " · Featured"}
                  {m.featuredAlumni && " · Featured Alumni"}
                  {m.awards.length > 0 && ` · ${m.awards.length} award${m.awards.length > 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="flex w-full shrink-0 flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
                <button type="button" onClick={() => move(index, -1)} className="py-1 text-sm text-fog">↑</button>
                <button type="button" onClick={() => move(index, 1)} className="py-1 text-sm text-fog">↓</button>
                <button type="button" onClick={() => setEditing(m)} className="py-1 text-xs text-accent">Edit</button>
                <button type="button" onClick={() => removeMember(m.id)} className="py-1 text-xs text-red-400">Remove</button>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <p className="py-6 text-center text-sm text-fog">No cast yet. Add your first member.</p>
          )}
        </div>
      )}

      {editing && (
        <div className="space-y-5 border border-stone/40 bg-charcoal/30 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Full Name">
              <AdminInput value={editing.fullName || ""} onChange={(e) => set("fullName", e.target.value)} />
            </AdminField>
            <AdminField label="Stage Name" hint="Optional — shown instead of full name">
              <AdminInput value={editing.stageName || ""} onChange={(e) => set("stageName", e.target.value)} />
            </AdminField>
            <AdminField
              label="Profile URL Slug"
              hint="Used for /sessions/cast/your-slug — auto-filled from name on new members"
            >
              <AdminInput
                value={editing.slug || ""}
                onChange={(e) => set("slug", slugifyName(e.target.value))}
                placeholder={slugifyName(editing.fullName || "member-name")}
              />
            </AdminField>
            <AdminField label="Creative Role">
              <select
                className="w-full"
                value={editing.role || "model"}
                onChange={(e) => set("role", e.target.value as CastRole)}
              >
                {CAST_ROLES.map((r) => (
                  <option key={r} value={r}>{CAST_ROLE_LABELS[r]}</option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Status">
              <select
                className="w-full"
                value={editing.status || "confirmed"}
                onChange={(e) => set("status", e.target.value as CastStatus)}
              >
                {CAST_STATUSES.map((s) => (
                  <option key={s} value={s}>{CAST_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </AdminField>
            <AdminField label="City">
              <AdminInput value={editing.city || ""} onChange={(e) => set("city", e.target.value)} />
            </AdminField>
            <AdminField label="Instagram" hint="@handle or URL">
              <AdminInput value={editing.instagram || ""} onChange={(e) => set("instagram", e.target.value)} />
            </AdminField>
            <AdminField label="TikTok" hint="@handle or URL">
              <AdminInput value={editing.tiktok || ""} onChange={(e) => set("tiktok", e.target.value)} />
            </AdminField>
            <AdminField label="Website">
              <AdminInput value={editing.website || ""} onChange={(e) => set("website", e.target.value)} />
            </AdminField>
            <AdminField label="Portfolio Link">
              <AdminInput value={editing.portfolioLink || ""} onChange={(e) => set("portfolioLink", e.target.value)} />
            </AdminField>
          </div>

          <AdminField label="Short Bio">
            <AdminTextarea value={editing.bio || ""} onChange={(e) => set("bio", e.target.value)} />
          </AdminField>

          <ImageUpload
            label="Profile Photo"
            value={editing.profilePhoto || null}
            onChange={(url) => set("profilePhoto", url)}
          />
          <GalleryUpload
            label="Additional Photos"
            hint="Shown in the cast member's profile gallery."
            images={editing.additionalPhotos || []}
            onChange={(imgs) => set("additionalPhotos", imgs)}
          />

          <div className="rounded border border-stone/30 p-4">
            <p className="mb-2 text-sm text-cream-dim">Alumni &amp; Network</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-fog">
                <input type="checkbox" checked={!!editing.featured} onChange={(e) => set("featured", e.target.checked)} />
                Featured in this Volume
              </label>
              <label className="flex items-center gap-2 text-sm text-fog">
                <input type="checkbox" checked={!!editing.isAlumni} onChange={(e) => set("isAlumni", e.target.checked)} />
                Alumni
              </label>
              <label className="flex items-center gap-2 text-sm text-fog">
                <input
                  type="checkbox"
                  checked={!!editing.featuredAlumni}
                  onChange={(e) => set("featuredAlumni", e.target.checked)}
                />
                Featured Alumni (shows on /sessions)
              </label>
              <label className="flex items-center gap-2 text-sm text-fog">
                <input
                  type="checkbox"
                  checked={!!editing.enableProfile}
                  onChange={(e) => set("enableProfile", e.target.checked)}
                />
                Enable public profile page
              </label>
            </div>
            {editing.enableProfile && editing.slug && (
              <p className="mt-3 text-xs break-all text-muted">
                Live at{" "}
                <span className="text-accent">/sessions/cast/{editing.slug}</span>
              </p>
            )}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <AdminField label="Future Collaborations">
                <AdminInput
                  value={editing.futureCollaborations || ""}
                  onChange={(e) => set("futureCollaborations", e.target.value)}
                />
              </AdminField>
              <AdminField label="Private Notes" hint="Admin only">
                <AdminInput value={editing.notes || ""} onChange={(e) => set("notes", e.target.value)} />
              </AdminField>
            </div>
          </div>

          <div className="rounded border border-stone/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-cream-dim">Awards</p>
              <button
                type="button"
                onClick={() =>
                  set("awards", [
                    ...awards,
                    { name: "", year: "", category: "", icon: "award", reason: "", volume: "" },
                  ])
                }
                className="text-xs text-accent"
              >
                Add award
              </button>
            </div>
            <div className="space-y-3">
              {awards.map((award, i) => (
                <div key={i} className="grid gap-2 border border-stone/20 p-3 md:grid-cols-2">
                  <AdminInput
                    placeholder="Award name"
                    value={award.name}
                    onChange={(e) => setAward(i, { name: e.target.value })}
                  />
                  <AdminInput
                    placeholder="Category (e.g. Best Editorial)"
                    value={award.category}
                    onChange={(e) => setAward(i, { category: e.target.value })}
                  />
                  <AdminInput
                    placeholder="Year"
                    value={award.year}
                    onChange={(e) => setAward(i, { year: e.target.value })}
                  />
                  <AdminInput
                    placeholder="Winning Volume (e.g. Vol. 1)"
                    value={award.volume}
                    onChange={(e) => setAward(i, { volume: e.target.value })}
                  />
                  <select
                    className="w-full"
                    value={award.icon}
                    onChange={(e) => setAward(i, { icon: e.target.value })}
                  >
                    {AWARD_ICONS.map((ic) => (
                      <option key={ic} value={ic}>{ic}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <AdminInput
                      placeholder="Reason (optional)"
                      value={award.reason}
                      onChange={(e) => setAward(i, { reason: e.target.value })}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => set("awards", awards.filter((_, idx) => idx !== i))}
                      className="shrink-0 border border-stone/50 px-3 py-2 text-xs text-fog"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={saveMember}
              disabled={saving}
              className="admin-touch-btn bg-cream tracking-[0.15em] text-ink uppercase disabled:opacity-50 sm:px-6"
            >
              {saving ? "Saving..." : "Save Member"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="admin-touch-btn border border-stone tracking-[0.15em] text-fog uppercase sm:px-6"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {msg && <p className="mt-3 text-xs text-accent">{msg}</p>}
    </div>
  );
}
