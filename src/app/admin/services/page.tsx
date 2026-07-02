"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
  ImageUpload,
  SaveBar,
  StringListEditor,
} from "@/components/admin/AdminForm";
import type { ServiceDTO, ServicesPageContent } from "@/lib/types";
import { DEFAULT_SERVICES_PAGE } from "@/lib/defaults";
import { saveAdminContent } from "@/lib/admin-save";

type ViewMode = "services" | "page";

const emptyService = (): Partial<ServiceDTO> => ({
  slug: "",
  title: "",
  tagline: "",
  description: "",
  forWhom: "",
  includes: [],
  deliverables: [],
  faqs: [],
  startingPrice: "",
  turnaround: "",
  image: null,
  bannerImage: null,
  thumbnailImage: null,
  imageAlt: "",
  featured: false,
  sortOrder: 0,
  published: true,
  archived: false,
});

export default function AdminServicesPage() {
  const [view, setView] = useState<ViewMode>("services");
  const [items, setItems] = useState<ServiceDTO[]>([]);
  const [pageContent, setPageContent] = useState<ServicesPageContent>(DEFAULT_SERVICES_PAGE);
  const [faqText, setFaqText] = useState("");
  const [pageSaving, setPageSaving] = useState(false);
  const [pageMessage, setPageMessage] = useState("");
  const [editing, setEditing] = useState<Partial<ServiceDTO> | null>(null);
  const [includesText, setIncludesText] = useState("");
  const [deliverablesText, setDeliverablesText] = useState("");
  const [faqsText, setFaqsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await adminFetch("/api/admin/services");
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => {
    load();
    adminFetch("/api/admin/content")
      .then((r) => r.json())
      .then((all: { key: string; value: unknown }[]) => {
        const item = all.find((c) => c.key === "servicesPage");
        if (item?.value) {
          const content = { ...DEFAULT_SERVICES_PAGE, ...(item.value as ServicesPageContent) };
          setPageContent(content);
          setFaqText(
            content.faq.items.map((f) => `${f.question}|${f.answer}`).join("\n")
          );
        }
      });
  }, []);

  function startEdit(item: ServiceDTO) {
    setEditing(item);
    setIncludesText(item.includes.join("\n"));
    setDeliverablesText(item.deliverables.join("\n"));
    setFaqsText((item.faqs || []).join("\n"));
  }

  function startNew() {
    setEditing(emptyService());
    setIncludesText("");
    setDeliverablesText("");
    setFaqsText("");
  }

  async function save() {
    if (!editing?.title || !editing.slug) return;
    setSaving(true);
    setMessage("");
    const payload = {
      ...editing,
      includes: includesText.split("\n").map((s) => s.trim()).filter(Boolean),
      deliverables: deliverablesText.split("\n").map((s) => s.trim()).filter(Boolean),
      faqs: faqsText.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    const isNew = !editing.id;
    const url = isNew ? "/api/admin/services" : `/api/admin/services/${editing.id}`;
    const method = isNew ? "POST" : "PUT";
    const res = await adminFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setMessage(res.ok ? "Saved." : "Save failed.");
    if (res.ok) setEditing(null);
    setSaving(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this service?")) return;
    const res = await adminFetch(`/api/admin/services/${id}`, { method: "DELETE" });
    setMessage(res.ok ? "Deleted." : "Delete failed.");
    load();
  }

  async function duplicate(item: ServiceDTO) {
    const copy = {
      ...item,
      id: undefined,
      title: `${item.title} (Copy)`,
      slug: `${item.slug}-copy`,
      published: false,
      archived: false,
    };
    setEditing(copy);
    setIncludesText(item.includes.join("\n"));
    setDeliverablesText(item.deliverables.join("\n"));
    setFaqsText((item.faqs || []).join("\n"));
  }

  async function savePageContent() {
    setPageSaving(true);
    setPageMessage("");
    const payload: ServicesPageContent = {
      ...pageContent,
      faq: {
        ...pageContent.faq,
        items: faqText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [question, ...rest] = line.split("|");
            return { question: question?.trim() || "", answer: rest.join("|").trim() };
          })
          .filter((f) => f.question),
      },
    };
    const ok = await saveAdminContent("servicesPage", payload);
    setPageMessage(ok ? "Page content saved." : "Save failed.");
    setPageSaving(false);
  }

  async function reorder(id: string, direction: -1 | 1) {
    const index = items.findIndex((i) => i.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    const order = next.map((item, sortOrder) => ({ id: item.id, sortOrder }));
    const res = await adminFetch("/api/admin/services/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
    if (res.ok) load();
  }

  return (
    <AdminShell title="Services">
      <div className="mb-6 flex gap-2">
        {(["services", "page"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setView(mode)}
            className={`px-3 py-1.5 text-xs uppercase ${
              view === mode ? "bg-cream text-ink" : "border border-stone/50 text-fog"
            }`}
          >
            {mode === "services" ? "Service Items" : "Page Content"}
          </button>
        ))}
      </div>

      {view === "page" ? (
        <div className="space-y-8">
          <section className="border border-stone/30 p-6">
            <h2 className="mb-6 font-display text-xl">Hero</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Eyebrow">
                <AdminInput
                  value={pageContent.hero.eyebrow}
                  onChange={(e) =>
                    setPageContent({ ...pageContent, hero: { ...pageContent.hero, eyebrow: e.target.value } })
                  }
                />
              </AdminField>
              <AdminField label="Headline">
                <AdminInput
                  value={pageContent.hero.headline}
                  onChange={(e) =>
                    setPageContent({ ...pageContent, hero: { ...pageContent.hero, headline: e.target.value } })
                  }
                />
              </AdminField>
              <div className="md:col-span-2">
                <AdminField label="Subheadline">
                  <AdminTextarea
                    value={pageContent.hero.subheadline}
                    onChange={(e) =>
                      setPageContent({ ...pageContent, hero: { ...pageContent.hero, subheadline: e.target.value } })
                    }
                  />
                </AdminField>
              </div>
              <ImageUpload
                label="Hero Image"
                value={pageContent.hero.image}
                onChange={(url) =>
                  setPageContent({ ...pageContent, hero: { ...pageContent.hero, image: url } })
                }
              />
              <AdminField label="Hero Video URL">
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
            </div>
          </section>

          <section className="border border-stone/30 p-6">
            <h2 className="mb-6 font-display text-xl">Editorial Sections</h2>
            <div className="space-y-8">
              {pageContent.sections.map((section, index) => (
                <div key={section.slug || index} className="space-y-4 border border-stone/20 p-4">
                  <p className="text-xs tracking-wide text-muted uppercase">{section.eyebrow || `Section ${index + 1}`}</p>
                  <AdminField label="Eyebrow">
                    <AdminInput
                      value={section.eyebrow}
                      onChange={(e) => {
                        const sections = [...pageContent.sections];
                        sections[index] = { ...sections[index], eyebrow: e.target.value };
                        setPageContent({ ...pageContent, sections });
                      }}
                    />
                  </AdminField>
                  <AdminField label="Headline">
                    <AdminInput
                      value={section.headline}
                      onChange={(e) => {
                        const sections = [...pageContent.sections];
                        sections[index] = { ...sections[index], headline: e.target.value };
                        setPageContent({ ...pageContent, sections });
                      }}
                    />
                  </AdminField>
                  <AdminField label="Description">
                    <AdminTextarea
                      value={section.description}
                      onChange={(e) => {
                        const sections = [...pageContent.sections];
                        sections[index] = { ...sections[index], description: e.target.value };
                        setPageContent({ ...pageContent, sections });
                      }}
                    />
                  </AdminField>
                  <StringListEditor
                    label="Capabilities"
                    items={section.capabilities}
                    onChange={(capabilities) => {
                      const sections = [...pageContent.sections];
                      sections[index] = { ...sections[index], capabilities };
                      setPageContent({ ...pageContent, sections });
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="border border-stone/30 p-6">
            <h2 className="mb-6 font-display text-xl">Process</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Eyebrow">
                <AdminInput
                  value={pageContent.process.eyebrow}
                  onChange={(e) =>
                    setPageContent({ ...pageContent, process: { ...pageContent.process, eyebrow: e.target.value } })
                  }
                />
              </AdminField>
              <AdminField label="Headline">
                <AdminInput
                  value={pageContent.process.headline}
                  onChange={(e) =>
                    setPageContent({ ...pageContent, process: { ...pageContent.process, headline: e.target.value } })
                  }
                />
              </AdminField>
              <div className="md:col-span-2">
                <AdminField label="Subheadline">
                  <AdminTextarea
                    value={pageContent.process.subheadline}
                    onChange={(e) =>
                      setPageContent({ ...pageContent, process: { ...pageContent.process, subheadline: e.target.value } })
                    }
                  />
                </AdminField>
              </div>
            </div>
            {pageContent.process.steps.map((step, i) => (
              <div key={i} className="mt-4 grid gap-3 border border-stone/20 p-4 md:grid-cols-3">
                <AdminField label="Step #">
                  <AdminInput
                    value={step.step}
                    onChange={(e) => {
                      const steps = [...pageContent.process.steps];
                      steps[i] = { ...steps[i], step: e.target.value };
                      setPageContent({ ...pageContent, process: { ...pageContent.process, steps } });
                    }}
                  />
                </AdminField>
                <AdminField label="Title">
                  <AdminInput
                    value={step.title}
                    onChange={(e) => {
                      const steps = [...pageContent.process.steps];
                      steps[i] = { ...steps[i], title: e.target.value };
                      setPageContent({ ...pageContent, process: { ...pageContent.process, steps } });
                    }}
                  />
                </AdminField>
                <div className="md:col-span-3">
                  <AdminField label="Description">
                    <AdminTextarea
                      value={step.description}
                      onChange={(e) => {
                        const steps = [...pageContent.process.steps];
                        steps[i] = { ...steps[i], description: e.target.value };
                        setPageContent({ ...pageContent, process: { ...pageContent.process, steps } });
                      }}
                    />
                  </AdminField>
                </div>
              </div>
            ))}
          </section>

          <section className="border border-stone/30 p-6">
            <h2 className="mb-6 font-display text-xl">Why ÉLEVÉ</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Eyebrow">
                <AdminInput
                  value={pageContent.whyEleve.eyebrow}
                  onChange={(e) =>
                    setPageContent({ ...pageContent, whyEleve: { ...pageContent.whyEleve, eyebrow: e.target.value } })
                  }
                />
              </AdminField>
              <AdminField label="Headline">
                <AdminInput
                  value={pageContent.whyEleve.headline}
                  onChange={(e) =>
                    setPageContent({ ...pageContent, whyEleve: { ...pageContent.whyEleve, headline: e.target.value } })
                  }
                />
              </AdminField>
            </div>
            {pageContent.whyEleve.items.map((item, i) => (
              <div key={i} className="mt-4 space-y-3 border border-stone/20 p-4">
                <AdminField label={`Pillar ${i + 1} title`}>
                  <AdminInput
                    value={item.title}
                    onChange={(e) => {
                      const items = [...pageContent.whyEleve.items];
                      items[i] = { ...items[i], title: e.target.value };
                      setPageContent({ ...pageContent, whyEleve: { ...pageContent.whyEleve, items } });
                    }}
                  />
                </AdminField>
                <AdminField label="Description">
                  <AdminTextarea
                    value={item.description}
                    onChange={(e) => {
                      const items = [...pageContent.whyEleve.items];
                      items[i] = { ...items[i], description: e.target.value };
                      setPageContent({ ...pageContent, whyEleve: { ...pageContent.whyEleve, items } });
                    }}
                  />
                </AdminField>
              </div>
            ))}
          </section>

          <section className="border border-stone/30 p-6">
            <h2 className="mb-6 font-display text-xl">FAQ Section</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Eyebrow">
                <AdminInput
                  value={pageContent.faq.eyebrow}
                  onChange={(e) =>
                    setPageContent({ ...pageContent, faq: { ...pageContent.faq, eyebrow: e.target.value } })
                  }
                />
              </AdminField>
              <AdminField label="Headline">
                <AdminInput
                  value={pageContent.faq.headline}
                  onChange={(e) =>
                    setPageContent({ ...pageContent, faq: { ...pageContent.faq, headline: e.target.value } })
                  }
                />
              </AdminField>
            </div>
            <div className="mt-4">
              <AdminField label="FAQ items (question|answer per line)">
                <AdminTextarea value={faqText} onChange={(e) => setFaqText(e.target.value)} rows={8} />
              </AdminField>
            </div>
          </section>

          <section className="border border-stone/30 p-6">
            <h2 className="mb-6 font-display text-xl">Final CTA</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Headline">
                <AdminInput
                  value={pageContent.finalCta.headline}
                  onChange={(e) =>
                    setPageContent({
                      ...pageContent,
                      finalCta: { ...pageContent.finalCta, headline: e.target.value },
                    })
                  }
                />
              </AdminField>
              <AdminField label="Subheadline">
                <AdminInput
                  value={pageContent.finalCta.subheadline}
                  onChange={(e) =>
                    setPageContent({
                      ...pageContent,
                      finalCta: { ...pageContent.finalCta, subheadline: e.target.value },
                    })
                  }
                />
              </AdminField>
              <AdminField label="Button label">
                <AdminInput
                  value={pageContent.finalCta.primaryLabel}
                  onChange={(e) =>
                    setPageContent({
                      ...pageContent,
                      finalCta: { ...pageContent.finalCta, primaryLabel: e.target.value },
                    })
                  }
                />
              </AdminField>
              <AdminField label="Button link">
                <AdminInput
                  value={pageContent.finalCta.primaryHref}
                  onChange={(e) =>
                    setPageContent({
                      ...pageContent,
                      finalCta: { ...pageContent.finalCta, primaryHref: e.target.value },
                    })
                  }
                />
              </AdminField>
            </div>
          </section>

          <SaveBar onSave={savePageContent} saving={pageSaving} message={pageMessage} />
        </div>
      ) : (
        <>
      <div className="mb-6 flex justify-between">
        <p className="text-sm text-fog">{items.length} services</p>
        <button
          type="button"
          onClick={startNew}
          className="bg-cream px-4 py-2 text-xs tracking-[0.15em] text-ink uppercase"
        >
          Add Service
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`border p-4 ${editing?.id === item.id ? "border-accent bg-charcoal/50" : "border-stone/30"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => startEdit(item)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm text-cream">{item.title}</p>
                  <p className="text-xs break-words text-muted">
                    {item.startingPrice}
                    {!item.published && " · Draft"}
                    {item.archived && " · Archived"}
                    {item.featured && " · Featured"}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-3">
                  <button type="button" onClick={() => reorder(item.id, -1)} className="py-1 text-sm text-fog">↑</button>
                  <button type="button" onClick={() => reorder(item.id, 1)} className="py-1 text-sm text-fog">↓</button>
                  <button type="button" onClick={() => duplicate(item)} className="py-1 text-xs text-fog">
                    Duplicate
                  </button>
                  <button type="button" onClick={() => remove(item.id)} className="py-1 text-xs text-red-400">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {editing && (
          <div className="min-w-0 border border-stone/30 p-6 lg:sticky lg:top-24 lg:self-start">
            <h2 className="mb-6 font-display text-xl">{editing.id ? "Edit Service" : "New Service"}</h2>
            <div className="space-y-4">
              <AdminField label="Title">
                <AdminInput
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </AdminField>
              <AdminField label="Slug">
                <AdminInput
                  value={editing.slug || ""}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                />
              </AdminField>
              <AdminField label="Tagline">
                <AdminInput
                  value={editing.tagline || ""}
                  onChange={(e) => setEditing({ ...editing, tagline: e.target.value })}
                />
              </AdminField>
              <AdminField label="Description">
                <AdminTextarea
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </AdminField>
              <AdminField label="Who it's for">
                <AdminTextarea
                  value={editing.forWhom || ""}
                  onChange={(e) => setEditing({ ...editing, forWhom: e.target.value })}
                />
              </AdminField>
              <AdminField label="Starting Price">
                <AdminInput
                  value={editing.startingPrice || ""}
                  onChange={(e) => setEditing({ ...editing, startingPrice: e.target.value })}
                />
              </AdminField>
              <AdminField label="Turnaround">
                <AdminInput
                  value={editing.turnaround || ""}
                  onChange={(e) => setEditing({ ...editing, turnaround: e.target.value })}
                />
              </AdminField>
              <AdminField label="What's included (one per line)">
                <AdminTextarea value={includesText} onChange={(e) => setIncludesText(e.target.value)} rows={4} />
              </AdminField>
              <AdminField label="Deliverables (one per line)">
                <AdminTextarea
                  value={deliverablesText}
                  onChange={(e) => setDeliverablesText(e.target.value)}
                  rows={4}
                />
              </AdminField>
              <AdminField label="FAQs (question|answer per line)">
                <AdminTextarea value={faqsText} onChange={(e) => setFaqsText(e.target.value)} rows={4} />
              </AdminField>
              <ImageUpload
                label="Service Image"
                value={editing.image ?? null}
                onChange={(url) => setEditing({ ...editing, image: url })}
              />
              <ImageUpload
                label="Banner Image"
                value={editing.bannerImage ?? null}
                onChange={(url) => setEditing({ ...editing, bannerImage: url })}
              />
              <ImageUpload
                label="Thumbnail"
                value={editing.thumbnailImage ?? null}
                onChange={(url) => setEditing({ ...editing, thumbnailImage: url })}
              />
              <label className="flex items-center gap-2 text-sm text-fog">
                <input
                  type="checkbox"
                  checked={!!editing.featured}
                  onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                />
                Featured service
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
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="w-full bg-cream py-3 text-xs tracking-[0.15em] text-ink uppercase disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Service"}
              </button>
            </div>
          </div>
        )}
      </div>
      {message && <p className="mt-6 text-sm text-accent">{message}</p>}
        </>
      )}
    </AdminShell>
  );
}
