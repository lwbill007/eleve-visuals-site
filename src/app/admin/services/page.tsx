"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
  ImageUpload,
} from "@/components/admin/AdminForm";
import type { ServiceDTO } from "@/lib/types";

const emptyService = (): Partial<ServiceDTO> => ({
  slug: "",
  title: "",
  tagline: "",
  description: "",
  forWhom: "",
  includes: [],
  deliverables: [],
  startingPrice: "",
  turnaround: "",
  image: null,
  bannerImage: null,
  thumbnailImage: null,
  imageAlt: "",
  sortOrder: 0,
  published: true,
  archived: false,
});

export default function AdminServicesPage() {
  const [items, setItems] = useState<ServiceDTO[]>([]);
  const [editing, setEditing] = useState<Partial<ServiceDTO> | null>(null);
  const [includesText, setIncludesText] = useState("");
  const [deliverablesText, setDeliverablesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await adminFetch("/api/admin/services");
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(item: ServiceDTO) {
    setEditing(item);
    setIncludesText(item.includes.join("\n"));
    setDeliverablesText(item.deliverables.join("\n"));
  }

  function startNew() {
    setEditing(emptyService());
    setIncludesText("");
    setDeliverablesText("");
  }

  async function save() {
    if (!editing?.title || !editing.slug) return;
    setSaving(true);
    setMessage("");
    const payload = {
      ...editing,
      includes: includesText.split("\n").map((s) => s.trim()).filter(Boolean),
      deliverables: deliverablesText.split("\n").map((s) => s.trim()).filter(Boolean),
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
  }

  return (
    <AdminShell title="Services">
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
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`border p-4 ${editing?.id === item.id ? "border-accent bg-charcoal/50" : "border-stone/30"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => startEdit(item)} className="text-left">
                  <p className="text-sm text-cream">{item.title}</p>
                  <p className="text-xs text-muted">
                    {item.startingPrice}
                    {!item.published && " · Draft"}
                    {item.archived && " · Archived"}
                  </p>
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => duplicate(item)} className="text-xs text-fog">
                    Duplicate
                  </button>
                  <button type="button" onClick={() => remove(item.id)} className="text-xs text-red-400">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {editing && (
          <div className="border border-stone/30 p-6 lg:sticky lg:top-24 lg:self-start">
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
    </AdminShell>
  );
}
