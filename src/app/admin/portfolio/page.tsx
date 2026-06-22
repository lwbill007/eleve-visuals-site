"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminPreviewImage } from "@/components/admin/AdminPreviewImage";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  GalleryUpload,
  ImageUpload,
  SaveBar,
  StringListEditor,
} from "@/components/admin/AdminForm";
import { saveAdminContent } from "@/lib/admin-save";
import { DEFAULT_PORTFOLIO_PAGE } from "@/lib/defaults";
import { PORTFOLIO_CATEGORIES, type AspectRatio, type PortfolioItemDTO, type PortfolioPageContent } from "@/lib/types";
import { resolvePortfolioCoverImage } from "@/lib/portfolio-utils";

const ASPECT_RATIOS: AspectRatio[] = ["portrait", "landscape", "square", "wide"];
const TABS = ["projects", "page"] as const;

const emptyItem = (): Partial<PortfolioItemDTO> => ({
  title: "",
  slug: "",
  subtitle: "",
  category: "Portraits",
  client: "",
  year: new Date().getFullYear().toString(),
  description: "",
  creativeProcess: "",
  image: null,
  imageAlt: "",
  heroImage: null,
  heroImageAlt: "",
  aspectRatio: "landscape",
  featured: false,
  portfolioFeatured: false,
  archived: false,
  sortOrder: 0,
  gallery: [],
  btsGallery: [],
  videos: [],
  deliverables: [],
  credits: [],
  relatedServices: [],
  seoTitle: "",
  seoDescription: "",
  published: true,
});

export default function AdminPortfolioPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("projects");
  const [items, setItems] = useState<PortfolioItemDTO[]>([]);
  const [pageContent, setPageContent] = useState<PortfolioPageContent>(DEFAULT_PORTFOLIO_PAGE);
  const [categories, setCategories] = useState<string[]>([...PORTFOLIO_CATEGORIES]);
  const [editing, setEditing] = useState<Partial<PortfolioItemDTO> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const [portfolioRes, contentRes] = await Promise.all([
      adminFetch("/api/admin/portfolio"),
      adminFetch("/api/admin/content?key=portfolioPage"),
    ]);
    if (portfolioRes.ok) setItems(await portfolioRes.json());
    if (contentRes.ok) {
      const data = await contentRes.json();
      const page = { ...DEFAULT_PORTFOLIO_PAGE, ...(data.value as PortfolioPageContent) };
      setPageContent(page);
      setCategories(page.categories?.length ? page.categories : [...PORTFOLIO_CATEGORIES]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveProject() {
    if (!editing?.title) return;
    setSaving(true);
    setMessage("");

    const isNew = !editing.id;
    const url = isNew ? "/api/admin/portfolio" : `/api/admin/portfolio/${editing.id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await adminFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });

    setMessage(res.ok ? "Project saved." : "Save failed.");
    if (res.ok) {
      setEditing(null);
      load();
    }
    setSaving(false);
  }

  async function savePageSettings() {
    setSaving(true);
    const next = { ...pageContent, categories };
    const ok = await saveAdminContent("portfolioPage", next);
    setMessage(ok ? "Page settings saved." : "Save failed.");
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this portfolio item?")) return;
    const res = await adminFetch(`/api/admin/portfolio/${id}`, { method: "DELETE" });
    setMessage(res.ok ? "Deleted." : "Delete failed.");
    if (res.ok) load();
  }

  async function duplicate(id: string) {
    const res = await adminFetch(`/api/admin/portfolio/${id}/duplicate`, { method: "POST" });
    setMessage(res.ok ? "Duplicated as draft." : "Duplicate failed.");
    if (res.ok) load();
  }

  async function reorder(id: string, direction: -1 | 1) {
    const index = items.findIndex((i) => i.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    const order = next.map((item, sortOrder) => ({ id: item.id, sortOrder }));
    const res = await adminFetch("/api/admin/portfolio/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
    if (res.ok) load();
  }

  return (
    <AdminShell title="Portfolio">
      <div className="mb-6 flex gap-2 border-b border-stone/30">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm ${tab === t ? "border-b-2 border-accent text-cream" : "text-fog"}`}
          >
            {t === "projects" ? "Projects" : "Page Settings"}
          </button>
        ))}
      </div>

      {tab === "page" ? (
        <div className="space-y-10">
          <section className="border border-stone/30 p-6">
            <h2 className="mb-6 font-display text-xl">Portfolio Hero</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Eyebrow">
                <AdminInput
                  value={pageContent.hero.eyebrow}
                  onChange={(e) =>
                    setPageContent({
                      ...pageContent,
                      hero: { ...pageContent.hero, eyebrow: e.target.value },
                    })
                  }
                />
              </AdminField>
              <AdminField label="Headline">
                <AdminInput
                  value={pageContent.hero.headline}
                  onChange={(e) =>
                    setPageContent({
                      ...pageContent,
                      hero: { ...pageContent.hero, headline: e.target.value },
                    })
                  }
                />
              </AdminField>
              <AdminField label="Subheadline">
                <AdminInput
                  value={pageContent.hero.subheadline}
                  onChange={(e) =>
                    setPageContent({
                      ...pageContent,
                      hero: { ...pageContent.hero, subheadline: e.target.value },
                    })
                  }
                />
              </AdminField>
              <AdminField label="Video URL (optional)">
                <AdminInput
                  value={pageContent.hero.videoUrl || ""}
                  onChange={(e) =>
                    setPageContent({
                      ...pageContent,
                      hero: { ...pageContent.hero, videoUrl: e.target.value || null },
                    })
                  }
                />
              </AdminField>
              <div className="md:col-span-2">
                <AdminField label="Description">
                  <AdminTextarea
                    value={pageContent.hero.description}
                    onChange={(e) =>
                      setPageContent({
                        ...pageContent,
                        hero: { ...pageContent.hero, description: e.target.value },
                      })
                    }
                  />
                </AdminField>
              </div>
              <div className="md:col-span-2">
                <ImageUpload
                  label="Hero Background Image"
                  value={pageContent.hero.image}
                  onChange={(url) =>
                    setPageContent({
                      ...pageContent,
                      hero: { ...pageContent.hero, image: url },
                    })
                  }
                />
              </div>
            </div>
          </section>

          <section className="border border-stone/30 p-6">
            <h2 className="mb-6 font-display text-xl">Statistics</h2>
            <StringListEditor
              label="Stats (label|value per line)"
              items={pageContent.stats.map((s) => `${s.label}|${s.value}`)}
              onChange={(lines) =>
                setPageContent({
                  ...pageContent,
                  stats: lines
                    .filter(Boolean)
                    .map((line) => {
                      const [label, value] = line.split("|");
                      return { label: label?.trim() || "", value: value?.trim() || "" };
                    })
                    .filter((s) => s.label),
                })
              }
            />
          </section>

          <section className="border border-stone/30 p-6">
            <h2 className="mb-6 font-display text-xl">Categories & Empty State</h2>
            <StringListEditor
              label="Filter categories (one per line — custom categories appear in project editor)"
              items={categories}
              onChange={setCategories}
            />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <AdminField label="Empty state headline">
                <AdminInput
                  value={pageContent.emptyState.headline}
                  onChange={(e) =>
                    setPageContent({
                      ...pageContent,
                      emptyState: { ...pageContent.emptyState, headline: e.target.value },
                    })
                  }
                />
              </AdminField>
              <AdminField label="Empty state CTA label">
                <AdminInput
                  value={pageContent.emptyState.ctaLabel}
                  onChange={(e) =>
                    setPageContent({
                      ...pageContent,
                      emptyState: { ...pageContent.emptyState, ctaLabel: e.target.value },
                    })
                  }
                />
              </AdminField>
              <div className="md:col-span-2">
                <AdminField label="Empty state subheadline">
                  <AdminTextarea
                    value={pageContent.emptyState.subheadline}
                    onChange={(e) =>
                      setPageContent({
                        ...pageContent,
                        emptyState: { ...pageContent.emptyState, subheadline: e.target.value },
                      })
                    }
                  />
                </AdminField>
              </div>
            </div>
          </section>

          <SaveBar onSave={savePageSettings} saving={saving} message={message} />
        </div>
      ) : (
        <>
          <div className="mb-6 flex justify-between">
            <p className="text-sm text-fog">{items.length} projects</p>
            <button
              type="button"
              onClick={() => setEditing(emptyItem())}
              className="bg-cream px-4 py-2 text-xs tracking-[0.15em] text-ink uppercase"
            >
              Add Project
            </button>
          </div>

          {editing && (
            <div className="mb-10 border border-stone/30 p-6">
              <h2 className="mb-6 font-display text-xl">
                {editing.id ? "Edit Project" : "New Project"}
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                <AdminField label="Title">
                  <AdminInput
                    value={editing.title || ""}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Slug (auto-generated if empty)">
                  <AdminInput
                    value={editing.slug || ""}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Subtitle">
                  <AdminInput
                    value={editing.subtitle || ""}
                    onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Category">
                  <AdminSelect
                    options={categories}
                    value={editing.category || "Portraits"}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Client (optional)">
                  <AdminInput
                    value={editing.client || ""}
                    onChange={(e) => setEditing({ ...editing, client: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Year">
                  <AdminInput
                    value={editing.year || ""}
                    onChange={(e) => setEditing({ ...editing, year: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Aspect Ratio">
                  <AdminSelect
                    options={ASPECT_RATIOS}
                    value={editing.aspectRatio || "landscape"}
                    onChange={(e) =>
                      setEditing({ ...editing, aspectRatio: e.target.value as AspectRatio })
                    }
                  />
                </AdminField>
                <AdminField label="Sort Order">
                  <AdminInput
                    type="number"
                    value={editing.sortOrder ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, sortOrder: parseInt(e.target.value) || 0 })
                    }
                  />
                </AdminField>
                <div className="md:col-span-2">
                  <AdminField label="Description">
                    <AdminTextarea
                      value={editing.description || ""}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    />
                  </AdminField>
                </div>
                <div className="md:col-span-2">
                  <AdminField label="Creative Process">
                    <AdminTextarea
                      value={editing.creativeProcess || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, creativeProcess: e.target.value })
                      }
                    />
                  </AdminField>
                </div>
                <div className="md:col-span-2">
                  <ImageUpload
                    label="Cover Image (grid card)"
                    value={editing.image || null}
                    onChange={(url) => setEditing({ ...editing, image: url ?? null })}
                  />
                </div>
                <div className="md:col-span-2">
                  <ImageUpload
                    label="Hero Image (case study page)"
                    value={editing.heroImage || null}
                    onChange={(url) => setEditing({ ...editing, heroImage: url ?? null })}
                  />
                </div>
                <div className="md:col-span-2">
                  <GalleryUpload
                    label="Project Gallery"
                    images={editing.gallery || []}
                    coverImage={editing.image || null}
                    onChange={(gallery) => setEditing({ ...editing, gallery })}
                    onCoverChange={(url) => setEditing({ ...editing, image: url ?? null })}
                  />
                </div>
                <div className="md:col-span-2">
                  <GalleryUpload
                    label="Behind the Scenes"
                    images={editing.btsGallery || []}
                    onChange={(btsGallery) => setEditing({ ...editing, btsGallery })}
                  />
                </div>
                <div className="md:col-span-2">
                  <StringListEditor
                    label="Video URLs (YouTube, Vimeo, or direct MP4)"
                    items={editing.videos || []}
                    onChange={(videos) => setEditing({ ...editing, videos })}
                  />
                </div>
                <div className="md:col-span-2">
                  <StringListEditor
                    label="Deliverables"
                    items={editing.deliverables || []}
                    onChange={(deliverables) => setEditing({ ...editing, deliverables })}
                  />
                </div>
                <div className="md:col-span-2">
                  <StringListEditor
                    label="Credits (role|name per line)"
                    items={(editing.credits || []).map((c) => `${c.role}|${c.name}`)}
                    onChange={(lines) =>
                      setEditing({
                        ...editing,
                        credits: lines
                          .filter(Boolean)
                          .map((line) => {
                            const [role, name] = line.split("|");
                            return { role: role?.trim() || "", name: name?.trim() || "" };
                          })
                          .filter((c) => c.role && c.name),
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <StringListEditor
                    label="Related Services"
                    items={editing.relatedServices || []}
                    onChange={(relatedServices) => setEditing({ ...editing, relatedServices })}
                  />
                </div>
                <AdminField label="SEO Title">
                  <AdminInput
                    value={editing.seoTitle || ""}
                    onChange={(e) => setEditing({ ...editing, seoTitle: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Image Alt Text">
                  <AdminInput
                    value={editing.imageAlt || ""}
                    onChange={(e) => setEditing({ ...editing, imageAlt: e.target.value })}
                  />
                </AdminField>
                <div className="md:col-span-2">
                  <AdminField label="SEO Description">
                    <AdminTextarea
                      value={editing.seoDescription || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, seoDescription: e.target.value })
                      }
                    />
                  </AdminField>
                </div>
                <div className="flex flex-wrap gap-6 md:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-fog">
                    <input
                      type="checkbox"
                      checked={!!editing.portfolioFeatured}
                      onChange={(e) =>
                        setEditing({ ...editing, portfolioFeatured: e.target.checked })
                      }
                    />
                    Featured on portfolio page
                  </label>
                  <label className="flex items-center gap-2 text-sm text-fog">
                    <input
                      type="checkbox"
                      checked={!!editing.featured}
                      onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                    />
                    Featured on homepage
                  </label>
                  <label className="flex items-center gap-2 text-sm text-fog">
                    <input
                      type="checkbox"
                      checked={editing.published !== false}
                      onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                    />
                    Published
                  </label>
                  <label className="flex items-center gap-2 text-sm text-fog">
                    <input
                      type="checkbox"
                      checked={!!editing.archived}
                      onChange={(e) => setEditing({ ...editing, archived: e.target.checked })}
                    />
                    Archived
                  </label>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={saveProject}
                  disabled={saving}
                  className="bg-cream px-5 py-2 text-xs text-ink uppercase disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Project"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="border border-stone px-5 py-2 text-xs text-fog uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {items.map((item) => {
              const coverImage = resolvePortfolioCoverImage(item.image, item.gallery);
              return (
                <div key={item.id} className="flex items-center gap-4 border border-stone/30 p-4">
                  <div className="relative h-16 w-24 shrink-0 bg-charcoal">
                    {coverImage ? (
                      <AdminPreviewImage src={coverImage} alt="" fill className="object-cover" sizes="96px" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-cream">{item.title}</p>
                    <p className="text-xs text-muted">
                      {item.category} · {item.year}
                      {item.portfolioFeatured && " · Portfolio Featured"}
                      {item.featured && " · Homepage"}
                      {item.archived && " · Archived"}
                      {!item.published && " · Draft"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => reorder(item.id, -1)} className="text-xs text-fog">
                      ↑
                    </button>
                    <button type="button" onClick={() => reorder(item.id, 1)} className="text-xs text-fog">
                      ↓
                    </button>
                    <button type="button" onClick={() => setEditing(item)} className="text-xs text-accent">
                      Edit
                    </button>
                    <button type="button" onClick={() => duplicate(item.id)} className="text-xs text-fog">
                      Duplicate
                    </button>
                    <button type="button" onClick={() => remove(item.id)} className="text-xs text-red-400">
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {message && tab === "projects" && <p className="mt-6 text-sm text-accent">{message}</p>}
        </>
      )}
    </AdminShell>
  );
}
