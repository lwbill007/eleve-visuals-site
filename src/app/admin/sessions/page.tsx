"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { CastManager } from "@/components/admin/CastManager";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
  ImageUpload,
  GalleryUpload,
  VideoGalleryUpload,
  AudioGalleryUpload,
  FileUpload,
  StringListEditor,
} from "@/components/admin/AdminForm";
import {
  SESSION_VOLUME_STATUSES,
  type SessionTimelineStep,
  type SessionVolumeDTO,
  type SessionVolumeStatus,
  type SessionsApplicationContent,
} from "@/lib/types";
import { DEFAULT_SESSIONS_APPLICATION } from "@/lib/defaults";
import { DEFAULT_SESSION_APPLICATION_SETTINGS } from "@/lib/session-application";
import { saveAdminContent } from "@/lib/admin-save";
import { getSessionStatusLabel, slugifySessionTitle, resolveSessionPosterImage } from "@/lib/session-volume";

const DEFAULT_TIMELINE: SessionTimelineStep[] = [
  { label: "Application Opens", detail: "" },
  { label: "Applications Close", detail: "" },
  { label: "Selection", detail: "" },
  { label: "Shoot Day", detail: "" },
  { label: "Final Delivery", detail: "" },
];

function emptyVolume(): Partial<SessionVolumeDTO> {
  return {
    volumeNumber: 1,
    title: "",
    slug: "",
    theme: "",
    subtitle: "",
    synopsis: "",
    posterImage: null,
    posterImageAlt: "",
    bannerImage: null,
    bannerImageAlt: "",
    moodBoard: [],
    gallery: [],
    btsGallery: [],
    videos: [],
    status: "draft",
    genre: "Creative Production",
    year: String(new Date().getFullYear()),
    sessionDate: "",
    sessionTime: "",
    location: "",
    city: "",
    capacity: "Limited capacity",
    category: "ÉLEVÉ Sessions",
    creativeDirector: "",
    directorsNote: "",
    galleryDelivery: "",
    dressCode: "",
    runtime: "",
    mood: "",
    season: "",
    difficulty: "",
    colorPalette: [],
    inspirations: [],
    testimonials: [],
    requirements: [],
    timeline: DEFAULT_TIMELINE,
    applicationDeadline: null,
    teaserVideoUrl: null,
    playlistUrl: null,
    interviews: [],
    audio: [],
    productionNotes: "",
    callSheet: null,
    creativeBrief: "",
    wardrobeGuide: null,
    sponsors: [],
    resources: [],
    faqs: [],
    featured: false,
    published: false,
    showApplyButton: true,
    seoTitle: "",
    seoDescription: "",
    sortOrder: 0,
    applicationSettings: { ...DEFAULT_SESSION_APPLICATION_SETTINGS },
  };
}

export default function AdminSessionsPage() {
  const [view, setView] = useState<"volumes" | "application">("volumes");
  const [items, setItems] = useState<SessionVolumeDTO[]>([]);
  const [applicationCopy, setApplicationCopy] = useState<SessionsApplicationContent>(DEFAULT_SESSIONS_APPLICATION);
  const [appSaving, setAppSaving] = useState(false);
  const [editing, setEditing] = useState<Partial<SessionVolumeDTO> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await adminFetch("/api/admin/session-volumes");
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => {
    load();
    adminFetch("/api/admin/content")
      .then((r) => r.json())
      .then((all: { key: string; value: unknown }[]) => {
        const item = all.find((c) => c.key === "sessionsApplication");
        if (item?.value) {
          setApplicationCopy({ ...DEFAULT_SESSIONS_APPLICATION, ...(item.value as SessionsApplicationContent) });
        }
      });
  }, []);

  function update<K extends keyof SessionVolumeDTO>(key: K, value: SessionVolumeDTO[K]) {
    if (!editing) return;
    const next = { ...editing, [key]: value };
    if (key === "title" && !editing.id && typeof value === "string") {
      next.slug = slugifySessionTitle(value);
    }
    setEditing(next);
  }

  async function save() {
    if (!editing?.title || !editing.slug) return;
    setSaving(true);
    setMessage("");

    const isNew = !editing.id;
    const url = isNew ? "/api/admin/session-volumes" : `/api/admin/session-volumes/${editing.id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await adminFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });

    setMessage(res.ok ? "Saved." : "Save failed.");
    if (res.ok) {
      setEditing(null);
      load();
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this session volume?")) return;
    const res = await adminFetch(`/api/admin/session-volumes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage("Delete failed.");
      return;
    }
    load();
  }

  async function duplicate(id: string) {
    const res = await adminFetch(`/api/admin/session-volumes/${id}/duplicate`, { method: "POST" });
    setMessage(res.ok ? "Volume duplicated as draft." : "Duplicate failed.");
    if (res.ok) load();
  }

  async function archiveVolume(item: SessionVolumeDTO) {
    const res = await adminFetch(`/api/admin/session-volumes/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, status: "archived", archived: true, published: false }),
    });
    setMessage(res.ok ? "Volume archived." : "Archive failed.");
    if (res.ok) load();
  }

  async function reorder(id: string, direction: -1 | 1) {
    const index = items.findIndex((i) => i.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    const order = next.map((vol, sortOrder) => ({ id: vol.id, sortOrder }));
    const res = await adminFetch("/api/admin/session-volumes/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
    if (res.ok) load();
  }

  async function saveApplicationCopy() {
    setAppSaving(true);
    const ok = await saveAdminContent("sessionsApplication", applicationCopy);
    setMessage(ok ? "Application copy saved." : "Save failed.");
    setAppSaving(false);
  }

  return (
    <AdminShell title="ÉLEVÉ Sessions">
      <div className="mb-6 flex gap-2">
        {(["volumes", "application"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setView(mode)}
            className={`px-3 py-1.5 text-xs uppercase ${
              view === mode ? "bg-cream text-ink" : "border border-stone/50 text-fog"
            }`}
          >
            {mode === "volumes" ? "Volumes" : "Application Form Copy"}
          </button>
        ))}
      </div>

      {view === "application" ? (
        <div className="max-w-2xl space-y-4 border border-stone/30 p-6">
          <AdminField label="Form headline">
            <AdminInput
              value={applicationCopy.headline}
              onChange={(e) => setApplicationCopy({ ...applicationCopy, headline: e.target.value })}
            />
          </AdminField>
          <AdminField label="Subheadline">
            <AdminTextarea
              value={applicationCopy.subheadline}
              onChange={(e) => setApplicationCopy({ ...applicationCopy, subheadline: e.target.value })}
            />
          </AdminField>
          <AdminField label="Success title">
            <AdminInput
              value={applicationCopy.successTitle}
              onChange={(e) => setApplicationCopy({ ...applicationCopy, successTitle: e.target.value })}
            />
          </AdminField>
          <AdminField label="Success message">
            <AdminTextarea
              value={applicationCopy.successMessage}
              onChange={(e) => setApplicationCopy({ ...applicationCopy, successMessage: e.target.value })}
            />
          </AdminField>
          <StringListEditor
            label="Next steps (after submit)"
            items={applicationCopy.nextSteps}
            onChange={(nextSteps) => setApplicationCopy({ ...applicationCopy, nextSteps })}
          />
          <button
            type="button"
            onClick={saveApplicationCopy}
            disabled={appSaving}
            className="admin-touch-btn bg-cream tracking-[0.15em] text-ink uppercase disabled:opacity-50 sm:px-6"
          >
            {appSaving ? "Saving..." : "Save Application Copy"}
          </button>
        </div>
      ) : (
        <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-fog">{items.length} volumes</p>
        <button
          type="button"
          onClick={() => setEditing(emptyVolume())}
          className="admin-touch-btn-compact shrink-0 bg-cream tracking-[0.15em] text-ink uppercase"
        >
          New Volume
        </button>
      </div>

      {editing && (
        <div className="mb-10 border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">
            {editing.id ? `Edit Vol. ${editing.volumeNumber}` : "New Session Volume"}
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <AdminField label="Volume Number">
              <AdminInput
                type="number"
                value={editing.volumeNumber ?? 1}
                onChange={(e) => update("volumeNumber", parseInt(e.target.value) || 1)}
              />
            </AdminField>
            <AdminField label="Year">
              <AdminInput
                value={editing.year || ""}
                onChange={(e) => update("year", e.target.value)}
              />
            </AdminField>
            <AdminField label="Title">
              <AdminInput
                value={editing.title || ""}
                onChange={(e) => update("title", e.target.value)}
              />
            </AdminField>
            <AdminField label="Slug" hint="URL: /sessions/your-slug">
              <AdminInput
                value={editing.slug || ""}
                onChange={(e) => update("slug", slugifySessionTitle(e.target.value))}
              />
            </AdminField>
            <AdminField label="Theme">
              <AdminInput
                value={editing.theme || ""}
                onChange={(e) => update("theme", e.target.value)}
              />
            </AdminField>
            <AdminField label="Genre">
              <AdminInput
                value={editing.genre || ""}
                onChange={(e) => update("genre", e.target.value)}
              />
            </AdminField>
            <div className="md:col-span-2">
              <AdminField label="Subtitle / Tagline">
                <AdminInput
                  value={editing.subtitle || ""}
                  onChange={(e) => update("subtitle", e.target.value)}
                />
              </AdminField>
            </div>
            <div className="md:col-span-2">
              <AdminField label="Synopsis">
                <AdminTextarea
                  value={editing.synopsis || ""}
                  onChange={(e) => update("synopsis", e.target.value)}
                  className="min-h-[140px]"
                />
              </AdminField>
            </div>
            <AdminField label="Status">
              <select
                className="w-full"
                value={editing.status || "draft"}
                onChange={(e) => update("status", e.target.value as SessionVolumeStatus)}
              >
                {SESSION_VOLUME_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {getSessionStatusLabel(status)}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Application Deadline" hint="ISO datetime for countdown">
              <AdminInput
                type="datetime-local"
                value={
                  editing.applicationDeadline
                    ? editing.applicationDeadline.slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  update(
                    "applicationDeadline",
                    e.target.value ? new Date(e.target.value).toISOString() : null
                  )
                }
              />
            </AdminField>
            <AdminField label="Session Date">
              <AdminInput
                value={editing.sessionDate || ""}
                onChange={(e) => update("sessionDate", e.target.value)}
              />
            </AdminField>
            <AdminField label="Session Time">
              <AdminInput
                value={editing.sessionTime || ""}
                onChange={(e) => update("sessionTime", e.target.value)}
              />
            </AdminField>
            <AdminField label="City">
              <AdminInput
                value={editing.city || ""}
                onChange={(e) => update("city", e.target.value)}
              />
            </AdminField>
            <AdminField label="Location">
              <AdminInput
                value={editing.location || ""}
                onChange={(e) => update("location", e.target.value)}
              />
            </AdminField>
            <AdminField label="Capacity">
              <AdminInput
                value={editing.capacity || ""}
                onChange={(e) => update("capacity", e.target.value)}
              />
            </AdminField>
            <AdminField label="Creative Director">
              <AdminInput
                value={editing.creativeDirector || ""}
                onChange={(e) => update("creativeDirector", e.target.value)}
              />
            </AdminField>
            <AdminField label="Gallery Delivery Estimate" hint='e.g. "4–6 weeks after the shoot"'>
              <AdminInput
                value={editing.galleryDelivery || ""}
                onChange={(e) => update("galleryDelivery", e.target.value)}
              />
            </AdminField>
            <div className="md:col-span-2">
              <AdminField label="Director's Note" hint="Shown on the featured volume. Optional.">
                <AdminTextarea
                  value={editing.directorsNote || ""}
                  onChange={(e) => update("directorsNote", e.target.value)}
                  className="min-h-[120px]"
                />
              </AdminField>
            </div>
            <AdminField label="Dress Code">
              <AdminInput
                value={editing.dressCode || ""}
                onChange={(e) => update("dressCode", e.target.value)}
              />
            </AdminField>
            <AdminField label="Runtime" hint="Estimated session length, e.g. '3 hours'">
              <AdminInput
                value={editing.runtime || ""}
                onChange={(e) => update("runtime", e.target.value)}
              />
            </AdminField>
            <AdminField label="Mood" hint='e.g. "Moody, romantic, defiant"'>
              <AdminInput value={editing.mood || ""} onChange={(e) => update("mood", e.target.value)} />
            </AdminField>
            <AdminField label="Season" hint='e.g. "Fall 2026"'>
              <AdminInput value={editing.season || ""} onChange={(e) => update("season", e.target.value)} />
            </AdminField>
            <AdminField label="Difficulty" hint='e.g. "Intermediate"'>
              <AdminInput
                value={editing.difficulty || ""}
                onChange={(e) => update("difficulty", e.target.value)}
              />
            </AdminField>
            <AdminField label="Teaser Video URL" hint="YouTube or direct MP4 URL">
              <AdminInput
                value={editing.teaserVideoUrl || ""}
                onChange={(e) => update("teaserVideoUrl", e.target.value || null)}
              />
            </AdminField>
            <AdminField label="Playlist URL" hint="Spotify, Apple Music, or YouTube playlist">
              <AdminInput
                value={editing.playlistUrl || ""}
                onChange={(e) => update("playlistUrl", e.target.value || null)}
              />
            </AdminField>
            <div className="md:col-span-2">
              <ImageUpload
                label="Poster Image"
                value={editing.posterImage || null}
                onChange={(url) => update("posterImage", url)}
              />
            </div>
            <div className="md:col-span-2">
              <ImageUpload
                label="Banner Image"
                value={editing.bannerImage || null}
                onChange={(url) => update("bannerImage", url)}
              />
            </div>
            <div className="md:col-span-2">
              <GalleryUpload
                label="Mood Board"
                hint="Reference images for the production."
                images={editing.moodBoard || []}
                onChange={(moodBoard) => update("moodBoard", moodBoard)}
              />
            </div>
            <div className="md:col-span-2">
              <GalleryUpload
                label="Gallery"
                hint="Session photos or stills for the detail page."
                images={editing.gallery || []}
                onChange={(gallery) => update("gallery", gallery)}
              />
            </div>
            <div className="md:col-span-2">
              <GalleryUpload
                label="Behind the Scenes"
                hint="BTS photos from the production. Each image has a Remove button."
                images={editing.btsGallery || []}
                onChange={(btsGallery) => update("btsGallery", btsGallery)}
              />
            </div>
            <div className="md:col-span-2">
              <VideoGalleryUpload
                label="Videos"
                hint="Upload MP4/WebM clips, or paste YouTube, Vimeo, or direct video URLs."
                videos={editing.videos || []}
                onChange={(videos) => update("videos", videos)}
              />
            </div>
            <div className="md:col-span-2 border-t border-stone/30 pt-6">
              <h3 className="mb-4 font-display text-lg">Behind the Scenes & Extras</h3>
            </div>
            <div className="md:col-span-2">
              <VideoGalleryUpload
                label="Interviews"
                hint="Interview clips — upload MP4/WebM or paste YouTube/Vimeo URLs."
                videos={editing.interviews || []}
                onChange={(interviews) => update("interviews", interviews)}
              />
            </div>
            <div className="md:col-span-2">
              <AudioGalleryUpload
                label="Audio"
                hint="Upload audio files or paste a SoundCloud / Spotify / MP3 URL."
                tracks={editing.audio || []}
                onChange={(audio) => update("audio", audio)}
              />
            </div>
            <div className="md:col-span-2">
              <AdminField label="Production Notes" hint="Notes from the production, shown in the BTS section.">
                <AdminTextarea
                  value={editing.productionNotes || ""}
                  onChange={(e) => update("productionNotes", e.target.value)}
                  className="min-h-[120px]"
                />
              </AdminField>
            </div>

            <div className="md:col-span-2 border-t border-stone/30 pt-6">
              <h3 className="mb-4 font-display text-lg">Creative Vision</h3>
            </div>
            <div className="md:col-span-2">
              <StringListEditor
                label="Color Palette (hex codes)"
                items={editing.colorPalette || []}
                onChange={(colorPalette) => update("colorPalette", colorPalette)}
                addLabel="Add color (e.g. #1a1a1a)"
              />
            </div>
            <div className="md:col-span-2">
              <StringListEditor
                label="Inspirations & References"
                items={editing.inspirations || []}
                onChange={(inspirations) => update("inspirations", inspirations)}
                addLabel="Add inspiration (film, fashion, music, etc.)"
              />
            </div>

            <div className="md:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-cream-dim">Testimonials</p>
                <button
                  type="button"
                  onClick={() =>
                    update("testimonials", [...(editing.testimonials || []), { quote: "", name: "", role: "" }])
                  }
                  className="text-xs text-accent"
                >
                  Add testimonial
                </button>
              </div>
              <div className="space-y-3">
                {(editing.testimonials || []).map((testimonial, index) => (
                  <div key={index} className="space-y-2 border border-stone/20 p-3">
                    <AdminTextarea
                      placeholder="Quote"
                      value={testimonial.quote}
                      onChange={(e) => {
                        const next = [...(editing.testimonials || [])];
                        next[index] = { ...next[index], quote: e.target.value };
                        update("testimonials", next);
                      }}
                      className="min-h-[80px]"
                    />
                    <div className="grid gap-2 md:grid-cols-2">
                      <AdminInput
                        placeholder="Name"
                        value={testimonial.name}
                        onChange={(e) => {
                          const next = [...(editing.testimonials || [])];
                          next[index] = { ...next[index], name: e.target.value };
                          update("testimonials", next);
                        }}
                      />
                      <div className="flex gap-2">
                        <AdminInput
                          placeholder="Role (e.g. Model, Vol. 1)"
                          value={testimonial.role}
                          onChange={(e) => {
                            const next = [...(editing.testimonials || [])];
                            next[index] = { ...next[index], role: e.target.value };
                            update("testimonials", next);
                          }}
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            update("testimonials", (editing.testimonials || []).filter((_, i) => i !== index))
                          }
                          className="border border-stone/50 px-3 text-xs text-fog"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 border-t border-stone/30 pt-6">
              <h3 className="mb-4 font-display text-lg">Production Files</h3>
            </div>
            <div className="md:col-span-2">
              <AdminField label="Creative Brief" hint="The creative direction for this Volume.">
                <AdminTextarea
                  value={editing.creativeBrief || ""}
                  onChange={(e) => update("creativeBrief", e.target.value)}
                  className="min-h-[140px]"
                />
              </AdminField>
            </div>
            <div className="md:col-span-2">
              <FileUpload
                label="Call Sheet"
                hint="Upload a PDF or paste a link (Google Doc, Dropbox, etc.)."
                accept=".pdf,application/pdf"
                value={editing.callSheet || null}
                onChange={(url) => update("callSheet", url)}
              />
            </div>
            <div className="md:col-span-2">
              <FileUpload
                label="Wardrobe Guide"
                hint="Upload a PDF or image lookbook, or paste a link."
                accept=".pdf,application/pdf,image/*"
                value={editing.wardrobeGuide || null}
                onChange={(url) => update("wardrobeGuide", url)}
              />
            </div>

            <div className="md:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-cream-dim">Sponsors</p>
                <button
                  type="button"
                  onClick={() =>
                    update("sponsors", [...(editing.sponsors || []), { name: "", logo: "", url: "" }])
                  }
                  className="text-xs text-accent"
                >
                  Add sponsor
                </button>
              </div>
              <div className="space-y-4">
                {(editing.sponsors || []).map((sponsor, index) => (
                  <div key={index} className="grid gap-3 border border-stone/20 p-3 md:grid-cols-2">
                    <AdminInput
                      placeholder="Sponsor name"
                      value={sponsor.name}
                      onChange={(e) => {
                        const next = [...(editing.sponsors || [])];
                        next[index] = { ...next[index], name: e.target.value };
                        update("sponsors", next);
                      }}
                    />
                    <AdminInput
                      placeholder="Website URL (optional)"
                      value={sponsor.url}
                      onChange={(e) => {
                        const next = [...(editing.sponsors || [])];
                        next[index] = { ...next[index], url: e.target.value };
                        update("sponsors", next);
                      }}
                    />
                    <div className="md:col-span-2">
                      <ImageUpload
                        label="Logo"
                        value={sponsor.logo || null}
                        onChange={(url) => {
                          const next = [...(editing.sponsors || [])];
                          next[index] = { ...next[index], logo: url || "" };
                          update("sponsors", next);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => update("sponsors", (editing.sponsors || []).filter((_, i) => i !== index))}
                      className="justify-self-start border border-stone/50 px-3 py-1 text-xs text-fog"
                    >
                      Remove sponsor
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-cream-dim">Resources</p>
                <button
                  type="button"
                  onClick={() => update("resources", [...(editing.resources || []), { label: "", url: "" }])}
                  className="text-xs text-accent"
                >
                  Add resource
                </button>
              </div>
              <div className="space-y-2">
                {(editing.resources || []).map((resource, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-2">
                    <AdminInput
                      placeholder="Label (e.g. Moodboard PDF)"
                      value={resource.label}
                      onChange={(e) => {
                        const next = [...(editing.resources || [])];
                        next[index] = { ...next[index], label: e.target.value };
                        update("resources", next);
                      }}
                    />
                    <div className="flex gap-2">
                      <AdminInput
                        placeholder="URL"
                        value={resource.url}
                        onChange={(e) => {
                          const next = [...(editing.resources || [])];
                          next[index] = { ...next[index], url: e.target.value };
                          update("resources", next);
                        }}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => update("resources", (editing.resources || []).filter((_, i) => i !== index))}
                        className="border border-stone/50 px-3 text-xs text-fog"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-cream-dim">FAQs</p>
                <button
                  type="button"
                  onClick={() => update("faqs", [...(editing.faqs || []), { question: "", answer: "" }])}
                  className="text-xs text-accent"
                >
                  Add FAQ
                </button>
              </div>
              <div className="space-y-3">
                {(editing.faqs || []).map((faq, index) => (
                  <div key={index} className="space-y-2 border border-stone/20 p-3">
                    <AdminInput
                      placeholder="Question"
                      value={faq.question}
                      onChange={(e) => {
                        const next = [...(editing.faqs || [])];
                        next[index] = { ...next[index], question: e.target.value };
                        update("faqs", next);
                      }}
                    />
                    <div className="flex gap-2">
                      <AdminTextarea
                        placeholder="Answer"
                        value={faq.answer}
                        onChange={(e) => {
                          const next = [...(editing.faqs || [])];
                          next[index] = { ...next[index], answer: e.target.value };
                          update("faqs", next);
                        }}
                        className="min-h-[80px] flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => update("faqs", (editing.faqs || []).filter((_, i) => i !== index))}
                        className="self-start border border-stone/50 px-3 py-1 text-xs text-fog"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <StringListEditor
                label="Requirements (who should apply)"
                items={editing.requirements || []}
                onChange={(requirements) => update("requirements", requirements)}
                addLabel="Add requirement"
              />
            </div>
            <div className="md:col-span-2">
              <p className="mb-3 text-sm text-cream-dim">Timeline</p>
              <div className="space-y-3">
                {(editing.timeline || []).map((step, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-2">
                    <AdminInput
                      placeholder="Step label"
                      value={step.label}
                      onChange={(e) => {
                        const timeline = [...(editing.timeline || [])];
                        timeline[index] = { ...timeline[index], label: e.target.value };
                        update("timeline", timeline);
                      }}
                    />
                    <div className="flex gap-2">
                      <AdminInput
                        placeholder="Detail (optional)"
                        value={step.detail || ""}
                        onChange={(e) => {
                          const timeline = [...(editing.timeline || [])];
                          timeline[index] = { ...timeline[index], detail: e.target.value };
                          update("timeline", timeline);
                        }}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          update(
                            "timeline",
                            (editing.timeline || []).filter((_, i) => i !== index)
                          )
                        }
                        className="border border-stone/50 px-3 text-xs text-fog"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    update("timeline", [...(editing.timeline || []), { label: "", detail: "" }])
                  }
                  className="text-xs text-accent"
                >
                  Add timeline step
                </button>
              </div>
            </div>
            <AdminField label="SEO Title">
              <AdminInput
                value={editing.seoTitle || ""}
                onChange={(e) => update("seoTitle", e.target.value)}
              />
            </AdminField>
            <AdminField label="Sort Order">
              <AdminInput
                type="number"
                value={editing.sortOrder ?? 0}
                onChange={(e) => update("sortOrder", parseInt(e.target.value) || 0)}
              />
            </AdminField>
            <div className="md:col-span-2">
              <AdminField label="SEO Description">
                <AdminTextarea
                  value={editing.seoDescription || ""}
                  onChange={(e) => update("seoDescription", e.target.value)}
                />
              </AdminField>
            </div>
            <div className="md:col-span-2 border-t border-stone/30 pt-6">
              <h3 className="mb-4 font-display text-lg">Application Controls</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <AdminField label="Max capacity (accepted)">
                  <AdminInput
                    type="number"
                    value={editing.applicationSettings?.maxCapacity ?? ""}
                    onChange={(e) =>
                      update("applicationSettings", {
                        ...(editing.applicationSettings || DEFAULT_SESSION_APPLICATION_SETTINGS),
                        maxCapacity: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  />
                </AdminField>
                <AdminField label="Custom confirmation message">
                  <AdminTextarea
                    value={editing.applicationSettings?.customConfirmationMessage || ""}
                    onChange={(e) =>
                      update("applicationSettings", {
                        ...(editing.applicationSettings || DEFAULT_SESSION_APPLICATION_SETTINGS),
                        customConfirmationMessage: e.target.value,
                      })
                    }
                  />
                </AdminField>
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                {(
                  [
                    ["waitlistEnabled", "Waitlist enabled"],
                    ["autoCloseOnDeadline", "Auto-close on deadline"],
                    ["autoCloseOnCapacity", "Auto-close at capacity"],
                    ["requirePortfolioUpload", "Require portfolio uploads"],
                    ["notifyAdminOnSubmission", "Notify admin on submission"],
                    ["notifyApplicantOnSubmission", "Email applicant confirmation"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-fog">
                    <input
                      type="checkbox"
                      checked={!!editing.applicationSettings?.[key]}
                      onChange={(e) =>
                        update("applicationSettings", {
                          ...(editing.applicationSettings || DEFAULT_SESSION_APPLICATION_SETTINGS),
                          [key]: e.target.checked,
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <AdminField label="Custom questions (label|required|maxChars per line)">
                <AdminTextarea
                  value={(editing.applicationSettings?.questions || [])
                    .map((q) => `${q.label}|${q.required ? "required" : "optional"}|${q.maxLength}`)
                    .join("\n")}
                  onChange={(e) => {
                    const previous = editing.applicationSettings?.questions || [];
                    const questions = e.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .map((line, i) => {
                        const [label, req, max] = line.split("|");
                        const trimmedLabel = label?.trim() || "";
                        const existing =
                          previous.find((q) => q.label === trimmedLabel) ?? previous[i];
                        const slug = trimmedLabel
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, "");
                        return {
                          id: existing?.id ?? (slug || `question-${i}`),
                          label: trimmedLabel,
                          required: req?.trim().toLowerCase() === "required",
                          maxLength: parseInt(max || "3000") || 3000,
                        };
                      })
                      .filter((q) => q.label);
                    update("applicationSettings", {
                      ...(editing.applicationSettings || DEFAULT_SESSION_APPLICATION_SETTINGS),
                      questions: questions.length > 0 ? questions : DEFAULT_SESSION_APPLICATION_SETTINGS.questions,
                    });
                  }}
                  rows={6}
                />
              </AdminField>
              </div>
            </div>
            {editing.id ? (
              <CastManager volumeId={editing.id} />
            ) : (
              <div className="md:col-span-2 border-t border-stone/30 pt-6">
                <h3 className="font-display text-lg">Cast &amp; Crew</h3>
                <p className="text-xs text-muted">Save this volume first, then reopen it to build the cast.</p>
              </div>
            )}
            <div className="flex flex-wrap gap-6 md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-fog">
                <input
                  type="checkbox"
                  checked={!!editing.featured}
                  onChange={(e) => update("featured", e.target.checked)}
                />
                Featured on /sessions
              </label>
              <label className="flex items-center gap-2 text-sm text-fog">
                <input
                  type="checkbox"
                  checked={editing.published !== false}
                  onChange={(e) => update("published", e.target.checked)}
                />
                Published
              </label>
              <label className="flex items-center gap-2 text-sm text-fog">
                <input
                  type="checkbox"
                  checked={editing.showApplyButton !== false}
                  onChange={(e) => update("showApplyButton", e.target.checked)}
                />
                Show apply button when open
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="admin-touch-btn bg-cream tracking-[0.15em] text-ink uppercase disabled:opacity-50 sm:px-6"
            >
              {saving ? "Saving..." : "Save Volume"}
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

      <div className="space-y-3">
        {items.map((item) => {
          const poster = resolveSessionPosterImage(item);
          return (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 border border-stone/30 p-4"
            >
              <div className="relative h-20 w-14 shrink-0 bg-charcoal">
                {poster ? (
                  <Image src={poster} alt="" fill className="object-cover" sizes="56px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-muted">
                    No poster
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate text-sm text-cream">
                  Vol. {item.volumeNumber} — {item.title}
                </p>
                <p className="text-xs text-muted">
                  {getSessionStatusLabel(item.status)}
                  {item.featured && " · Featured"}
                  {!item.published && " · Draft"}
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 sm:w-auto sm:justify-end">
                <button type="button" onClick={() => reorder(item.id, -1)} className="py-1 text-sm text-fog">↑</button>
                <button type="button" onClick={() => reorder(item.id, 1)} className="py-1 text-sm text-fog">↓</button>
                <Link href={`/sessions/${item.slug}`} className="py-1 text-xs text-fog hover:text-cream">
                  View
                </Link>
                <button type="button" onClick={() => setEditing(item)} className="py-1 text-xs text-accent">
                  Edit
                </button>
                <button type="button" onClick={() => duplicate(item.id)} className="py-1 text-xs text-fog">
                  Duplicate
                </button>
                {item.status !== "archived" && (
                  <button type="button" onClick={() => archiveVolume(item)} className="py-1 text-xs text-fog">
                    Archive
                  </button>
                )}
                <button type="button" onClick={() => remove(item.id)} className="py-1 text-xs text-red-400">
                  Delete
                </button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="py-12 text-center text-fog">
            No session volumes yet. Create Vol. 1 to launch the collection.
          </p>
        )}
      </div>

      {message && <p className="mt-6 text-sm text-accent">{message}</p>}
        </>
      )}
    </AdminShell>
  );
}
