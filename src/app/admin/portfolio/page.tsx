"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import Image from "next/image";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  ImageUpload,
} from "@/components/admin/AdminForm";
import { PORTFOLIO_CATEGORIES, type AspectRatio, type PortfolioItemDTO } from "@/lib/types";

const ASPECT_RATIOS: AspectRatio[] = ["portrait", "landscape", "square", "wide"];

const emptyItem = (): Partial<PortfolioItemDTO> => ({
  title: "",
  category: "Portraits",
  client: "",
  year: new Date().getFullYear().toString(),
  description: "",
  image: null,
  imageAlt: "",
  aspectRatio: "landscape",
  featured: false,
  sortOrder: 0,
  gallery: [],
  published: true,
});

export default function AdminPortfolioPage() {
  const [items, setItems] = useState<PortfolioItemDTO[]>([]);
  const [editing, setEditing] = useState<Partial<PortfolioItemDTO> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await adminFetch("/api/admin/portfolio");
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
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

    if (res.ok) {
      setMessage("Saved.");
      setEditing(null);
      load();
    } else {
      setMessage("Save failed.");
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this portfolio item?")) return;
    const res = await adminFetch(`/api/admin/portfolio/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage("Delete failed.");
      return;
    }
    load();
  }

  return (
    <AdminShell title="Portfolio">
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
            <AdminField label="Category">
              <AdminSelect
                options={[...PORTFOLIO_CATEGORIES]}
                value={editing.category || "Portraits"}
                onChange={(e) =>
                  setEditing({ ...editing, category: e.target.value as PortfolioItemDTO["category"] })
                }
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
            <AdminField label="Sort Order" hint="Lower numbers appear first">
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
              <ImageUpload
                label="Cover Image"
                value={editing.image || null}
                onChange={(url) => setEditing({ ...editing, image: url })}
              />
            </div>
            <AdminField label="Image Alt Text">
              <AdminInput
                value={editing.imageAlt || ""}
                onChange={(e) => setEditing({ ...editing, imageAlt: e.target.value })}
              />
            </AdminField>
            <div className="flex flex-wrap gap-6 md:col-span-2">
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
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={save}
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
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 border border-stone/30 p-4"
          >
            <div className="relative h-16 w-24 shrink-0 bg-charcoal">
              {item.image ? (
                <Image src={item.image} alt="" fill className="object-cover" sizes="96px" />
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
                {item.featured && " · Featured"}
                {!item.published && " · Draft"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setEditing(item)}
                className="text-xs text-accent"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="text-xs text-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-12 text-center text-fog">
            No portfolio items yet. Add your first project above.
          </p>
        )}
      </div>

      {message && <p className="mt-6 text-sm text-accent">{message}</p>}
    </AdminShell>
  );
}
