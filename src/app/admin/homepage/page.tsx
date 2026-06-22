"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
  ImageUpload,
  SaveBar,
} from "@/components/admin/AdminForm";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/admin-fetch";
import { saveAdminContent } from "@/lib/admin-save";
import {
  DEFAULT_HERO,
  DEFAULT_HOMEPAGE,
  DEFAULT_PAGE_COPY,
} from "@/lib/defaults";
import type { HeroContent, HomepageContent, PageCopy, SessionVolumeDTO } from "@/lib/types";

export default function AdminHomepagePage() {
  const [hero, setHero] = useState<HeroContent>(DEFAULT_HERO);
  const [homepage, setHomepage] = useState<HomepageContent>(DEFAULT_HOMEPAGE);
  const [homeCta, setHomeCta] = useState<PageCopy["homeCta"]>(DEFAULT_PAGE_COPY.homeCta);
  const [sessions, setSessions] = useState<SessionVolumeDTO[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/content")
      .then((r) => r.json())
      .then((items: { key: string; value: unknown }[]) => {
        for (const item of items) {
          if (item.key === "hero") setHero({ ...DEFAULT_HERO, ...(item.value as HeroContent) });
          if (item.key === "homepage")
            setHomepage({ ...DEFAULT_HOMEPAGE, ...(item.value as HomepageContent) });
          if (item.key === "pageCopy") {
            const copy = item.value as PageCopy;
            setHomeCta(copy.homeCta);
          }
        }
      });
    adminFetch("/api/admin/session-volumes")
      .then((r) => (r.ok ? r.json() : []))
      .then(setSessions);
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const pageCopyRes = await adminFetch("/api/admin/content?key=pageCopy");
    const pageCopy = pageCopyRes.ok ? await pageCopyRes.json() : { value: DEFAULT_PAGE_COPY };
    const nextCopy = { ...(pageCopy.value as PageCopy), homeCta };
    const results = await Promise.all([
      saveAdminContent("hero", hero),
      saveAdminContent("homepage", homepage),
      saveAdminContent("pageCopy", nextCopy),
    ]);
    setMessage(results.every(Boolean) ? "Homepage saved." : "Some fields failed to save.");
    setSaving(false);
  }

  function moveSection(index: number, direction: -1 | 1) {
    const next = [...homepage.sections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setHomepage({ ...homepage, sections: next });
  }

  function reorderSections(from: number, to: number) {
    if (from === to) return;
    const next = [...homepage.sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setHomepage({ ...homepage, sections: next });
  }

  return (
    <AdminShell title="Homepage">
      <p className="mb-8 text-sm text-fog">
        Control the public homepage hero, section visibility, featured session, and CTA.
        Featured portfolio and services are managed in{" "}
        <Link href="/admin/portfolio" className="text-accent">
          Portfolio
        </Link>{" "}
        and{" "}
        <Link href="/admin/services" className="text-accent">
          Services
        </Link>{" "}
        via the Featured toggle.
      </p>

      <div className="space-y-10">
        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Hero</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <AdminField label="Headline">
              <AdminInput
                value={hero.headline}
                onChange={(e) => setHero({ ...hero, headline: e.target.value })}
              />
            </AdminField>
            <AdminField label="Subtitle">
              <AdminInput
                value={hero.subheadline}
                onChange={(e) => setHero({ ...hero, subheadline: e.target.value })}
              />
            </AdminField>
            <AdminField label="Description">
              <AdminTextarea
                value={hero.description}
                onChange={(e) => setHero({ ...hero, description: e.target.value })}
                rows={3}
              />
            </AdminField>
            <ImageUpload
              label="Background Image"
              value={hero.image}
              onChange={(url) => setHero({ ...hero, image: url })}
            />
            <AdminField label="Background Video URL (optional)">
              <AdminInput
                value={hero.videoUrl || ""}
                onChange={(e) => setHero({ ...hero, videoUrl: e.target.value || null })}
                placeholder="https://..."
              />
            </AdminField>
          </div>
        </section>

        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Homepage Sections</h2>
          <div className="space-y-3">
            {homepage.sections.map((section, index) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) reorderSections(dragIndex, index);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 border border-stone/30 p-4",
                  dragIndex === index && "opacity-50"
                )}
              >
                <label className="flex items-center gap-3 text-sm text-cream">
                  <input
                    type="checkbox"
                    checked={section.enabled}
                    onChange={(e) => {
                      const next = [...homepage.sections];
                      next[index] = { ...section, enabled: e.target.checked };
                      setHomepage({ ...homepage, sections: next });
                    }}
                  />
                  {section.label}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveSection(index, -1)}
                    className="border border-stone/50 px-2 py-1 text-xs text-fog"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(index, 1)}
                    className="border border-stone/50 px-2 py-1 text-xs text-fog"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
          <AdminField label="Featured Session Volume">
            <select
              className="w-full"
              value={homepage.featuredSessionVolumeId || ""}
              onChange={(e) =>
                setHomepage({
                  ...homepage,
                  featuredSessionVolumeId: e.target.value || null,
                })
              }
            >
              <option value="">None (auto-featured)</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  Vol. {s.volumeNumber} — {s.title}
                </option>
              ))}
            </select>
          </AdminField>
        </section>

        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Homepage CTA</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Headline">
              <AdminInput
                value={homeCta.headline}
                onChange={(e) => setHomeCta({ ...homeCta, headline: e.target.value })}
              />
            </AdminField>
            <AdminField label="Subheadline">
              <AdminInput
                value={homeCta.subheadline}
                onChange={(e) => setHomeCta({ ...homeCta, subheadline: e.target.value })}
              />
            </AdminField>
            <AdminField label="Primary Button">
              <AdminInput
                value={homeCta.primaryLabel}
                onChange={(e) => setHomeCta({ ...homeCta, primaryLabel: e.target.value })}
              />
            </AdminField>
            <AdminField label="Primary Link">
              <AdminInput
                value={homeCta.primaryHref}
                onChange={(e) => setHomeCta({ ...homeCta, primaryHref: e.target.value })}
              />
            </AdminField>
            <AdminField label="Secondary Button">
              <AdminInput
                value={homeCta.secondaryLabel}
                onChange={(e) => setHomeCta({ ...homeCta, secondaryLabel: e.target.value })}
              />
            </AdminField>
            <AdminField label="Secondary Link">
              <AdminInput
                value={homeCta.secondaryHref}
                onChange={(e) => setHomeCta({ ...homeCta, secondaryHref: e.target.value })}
              />
            </AdminField>
          </div>
        </section>
      </div>

      <SaveBar onSave={handleSave} saving={saving} message={message} />
    </AdminShell>
  );
}
