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
  StringListEditor,
} from "@/components/admin/AdminForm";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/admin-fetch";
import { saveAdminContent } from "@/lib/admin-save";
import { DEFAULT_HERO, DEFAULT_HOMEPAGE } from "@/lib/defaults";
import type { HeroContent, HomepageContent, SessionVolumeDTO } from "@/lib/types";

export default function AdminHomepagePage() {
  const [hero, setHero] = useState<HeroContent>(DEFAULT_HERO);
  const [homepage, setHomepage] = useState<HomepageContent>(DEFAULT_HOMEPAGE);
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
        }
      });
    adminFetch("/api/admin/session-volumes")
      .then((r) => (r.ok ? r.json() : []))
      .then(setSessions);
  }, []);

  async function handleSave() {
    setSaving(true);
    const results = await Promise.all([
      saveAdminContent("hero", hero),
      saveAdminContent("homepage", homepage),
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

  function updateCopy<K extends keyof HomepageContent["copy"]>(
    section: K,
    field: string,
    value: string
  ) {
    setHomepage({
      ...homepage,
      copy: {
        ...homepage.copy,
        [section]: { ...homepage.copy[section], [field]: value },
      },
    });
  }

  return (
    <AdminShell title="Homepage">
      <p className="mb-8 text-sm text-fog">
        Cinematic homepage control center. Portfolio, services, sessions, and testimonials are
        managed in their respective admin sections — use Featured toggles and ordering there.
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
            <AdminField label="Supporting Text">
              <AdminInput
                value={hero.subheadline}
                onChange={(e) => setHero({ ...hero, subheadline: e.target.value })}
              />
            </AdminField>
            <div className="lg:col-span-2">
              <AdminField label="Extra Description (optional)">
                <AdminTextarea
                  value={hero.description}
                  onChange={(e) => setHero({ ...hero, description: e.target.value })}
                  rows={2}
                />
              </AdminField>
            </div>
            <AdminField label="Primary CTA Label">
              <AdminInput
                value={hero.primaryCta.label}
                onChange={(e) =>
                  setHero({ ...hero, primaryCta: { ...hero.primaryCta, label: e.target.value } })
                }
              />
            </AdminField>
            <AdminField label="Primary CTA Link">
              <AdminInput
                value={hero.primaryCta.href}
                onChange={(e) =>
                  setHero({ ...hero, primaryCta: { ...hero.primaryCta, href: e.target.value } })
                }
              />
            </AdminField>
            <AdminField label="Secondary CTA Label">
              <AdminInput
                value={hero.secondaryCta.label}
                onChange={(e) =>
                  setHero({
                    ...hero,
                    secondaryCta: { ...hero.secondaryCta, label: e.target.value },
                  })
                }
              />
            </AdminField>
            <AdminField label="Secondary CTA Link">
              <AdminInput
                value={hero.secondaryCta.href}
                onChange={(e) =>
                  setHero({
                    ...hero,
                    secondaryCta: { ...hero.secondaryCta, href: e.target.value },
                  })
                }
              />
            </AdminField>
            <div className="lg:col-span-2">
              <ImageUpload
                label="Background Image"
                value={hero.image}
                onChange={(url) => setHero({ ...hero, image: url })}
              />
            </div>
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
          <h2 className="mb-6 font-display text-xl">Signature Stats</h2>
          <label className="mb-4 flex items-center gap-2 text-sm text-fog">
            <input
              type="checkbox"
              checked={homepage.stats.enabled}
              onChange={(e) =>
                setHomepage({
                  ...homepage,
                  stats: { ...homepage.stats, enabled: e.target.checked },
                })
              }
            />
            Show stats section
          </label>
          <StringListEditor
            label="Stats (label|value per line — leave value empty to hide number)"
            items={homepage.stats.items.map((s) => `${s.label}|${s.value}`)}
            onChange={(lines) =>
              setHomepage({
                ...homepage,
                stats: {
                  ...homepage.stats,
                  items: lines
                    .filter(Boolean)
                    .map((line) => {
                      const [label, value] = line.split("|");
                      return {
                        label: label?.trim() || "",
                        value: value?.trim() || "",
                        enabled: true,
                      };
                    })
                    .filter((s) => s.label),
                },
              })
            }
          />
        </section>

        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Sections & Order</h2>
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
                  <button type="button" onClick={() => moveSection(index, -1)} className="border border-stone/50 px-2 py-1 text-xs text-fog">↑</button>
                  <button type="button" onClick={() => moveSection(index, 1)} className="border border-stone/50 px-2 py-1 text-xs text-fog">↓</button>
                </div>
              </div>
            ))}
          </div>
          <AdminField label="Featured Session Volume">
            <select
              className="w-full"
              value={homepage.featuredSessionVolumeId || ""}
              onChange={(e) =>
                setHomepage({ ...homepage, featuredSessionVolumeId: e.target.value || null })
              }
            >
              <option value="">Auto (featured volume)</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  Vol. {s.volumeNumber} — {s.title}
                </option>
              ))}
            </select>
          </AdminField>
        </section>

        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Featured Work Filters</h2>
          <StringListEditor
            label="Category filter chips (one per line)"
            items={homepage.workFilters}
            onChange={(workFilters) => setHomepage({ ...homepage, workFilters })}
          />
          <p className="mt-3 text-xs text-muted">
            Projects managed in{" "}
            <Link href="/admin/portfolio" className="text-accent">
              Portfolio
            </Link>
            . Use Featured on homepage toggle per project.
          </p>
        </section>

        {(
          [
            ["featuredWork", "Featured Work"],
            ["services", "Services Preview"],
            ["sessions", "ÉLEVÉ Sessions"],
            ["whyEleve", "Why ÉLEVÉ"],
            ["process", "Client Experience"],
            ["testimonials", "Testimonials"],
          ] as const
        ).map(([key, title]) => (
          <section key={key} className="border border-stone/30 p-6">
            <h2 className="mb-4 font-display text-lg">{title} Copy</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Eyebrow">
                <AdminInput
                  value={homepage.copy[key].eyebrow || ""}
                  onChange={(e) => updateCopy(key, "eyebrow", e.target.value)}
                />
              </AdminField>
              <AdminField label="Headline">
                <AdminInput
                  value={homepage.copy[key].headline}
                  onChange={(e) => updateCopy(key, "headline", e.target.value)}
                />
              </AdminField>
              <div className="md:col-span-2">
                <AdminField label="Subheadline">
                  <AdminTextarea
                    value={homepage.copy[key].subheadline || ""}
                    onChange={(e) => updateCopy(key, "subheadline", e.target.value)}
                    rows={2}
                  />
                </AdminField>
              </div>
            </div>
          </section>
        ))}

        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Why ÉLEVÉ Pillars</h2>
          <StringListEditor
            label="Pillars (title|description per line)"
            items={homepage.whyPillars.map((p) => `${p.title}|${p.description}`)}
            onChange={(lines) =>
              setHomepage({
                ...homepage,
                whyPillars: lines
                  .filter(Boolean)
                  .map((line) => {
                    const [title, ...rest] = line.split("|");
                    return { title: title?.trim() || "", description: rest.join("|").trim() };
                  })
                  .filter((p) => p.title),
              })
            }
          />
          <p className="mt-3 text-xs text-muted">
            Founder story paragraphs are edited in{" "}
            <Link href="/admin/content" className="text-accent">
              About & Pages → Brand Story
            </Link>
            .
          </p>
        </section>

        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Client Experience Timeline</h2>
          <StringListEditor
            label="Steps (number|title|description per line)"
            items={homepage.processSteps.map((s) => `${s.step}|${s.title}|${s.description}`)}
            onChange={(lines) =>
              setHomepage({
                ...homepage,
                processSteps: lines
                  .filter(Boolean)
                  .map((line) => {
                    const [step, title, ...rest] = line.split("|");
                    return {
                      step: step?.trim() || "",
                      title: title?.trim() || "",
                      description: rest.join("|").trim(),
                    };
                  })
                  .filter((s) => s.title),
              })
            }
          />
        </section>

        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Final CTA</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Eyebrow">
              <AdminInput
                value={homepage.copy.cta.eyebrow || ""}
                onChange={(e) => updateCopy("cta", "eyebrow", e.target.value)}
              />
            </AdminField>
            <AdminField label="Headline">
              <AdminInput
                value={homepage.copy.cta.headline}
                onChange={(e) => updateCopy("cta", "headline", e.target.value)}
              />
            </AdminField>
            <div className="md:col-span-2">
              <AdminField label="Subheadline">
                <AdminTextarea
                  value={homepage.copy.cta.subheadline || ""}
                  onChange={(e) => updateCopy("cta", "subheadline", e.target.value)}
                  rows={2}
                />
              </AdminField>
            </div>
            <AdminField label="Primary Button">
              <AdminInput
                value={homepage.copy.cta.primaryLabel}
                onChange={(e) =>
                  setHomepage({
                    ...homepage,
                    copy: {
                      ...homepage.copy,
                      cta: { ...homepage.copy.cta, primaryLabel: e.target.value },
                    },
                  })
                }
              />
            </AdminField>
            <AdminField label="Primary Link">
              <AdminInput
                value={homepage.copy.cta.primaryHref}
                onChange={(e) =>
                  setHomepage({
                    ...homepage,
                    copy: {
                      ...homepage.copy,
                      cta: { ...homepage.copy.cta, primaryHref: e.target.value },
                    },
                  })
                }
              />
            </AdminField>
            <AdminField label="Secondary Button">
              <AdminInput
                value={homepage.copy.cta.secondaryLabel || ""}
                onChange={(e) =>
                  setHomepage({
                    ...homepage,
                    copy: {
                      ...homepage.copy,
                      cta: { ...homepage.copy.cta, secondaryLabel: e.target.value },
                    },
                  })
                }
              />
            </AdminField>
            <AdminField label="Secondary Link">
              <AdminInput
                value={homepage.copy.cta.secondaryHref || ""}
                onChange={(e) =>
                  setHomepage({
                    ...homepage,
                    copy: {
                      ...homepage.copy,
                      cta: { ...homepage.copy.cta, secondaryHref: e.target.value },
                    },
                  })
                }
              />
            </AdminField>
            <div className="md:col-span-2">
              <ImageUpload
                label="Background Image"
                value={homepage.copy.cta.backgroundImage}
                onChange={(url) =>
                  setHomepage({
                    ...homepage,
                    copy: {
                      ...homepage.copy,
                      cta: { ...homepage.copy.cta, backgroundImage: url },
                    },
                  })
                }
              />
            </div>
            <AdminField label="Background Video URL">
              <AdminInput
                value={homepage.copy.cta.videoUrl || ""}
                onChange={(e) =>
                  setHomepage({
                    ...homepage,
                    copy: {
                      ...homepage.copy,
                      cta: { ...homepage.copy.cta, videoUrl: e.target.value || null },
                    },
                  })
                }
              />
            </AdminField>
          </div>
        </section>
      </div>

      <SaveBar onSave={handleSave} saving={saving} message={message} />
    </AdminShell>
  );
}
