"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminField, AdminInput, AdminTextarea } from "@/components/admin/AdminForm";
import type { TestimonialDTO } from "@/lib/types";

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<TestimonialDTO[]>([]);
  const [editing, setEditing] = useState<Partial<TestimonialDTO> | null>(null);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  async function load() {
    const res = await adminFetch("/api/admin/testimonials");
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing?.quote || !editing.name) return;
    setSaving(true);
    setMessage("");
    const isNew = !editing.id;
    const url = isNew ? "/api/admin/testimonials" : `/api/admin/testimonials/${editing.id}`;
    const method = isNew ? "POST" : "PUT";
    const res = await adminFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setMessage(res.ok ? "Saved." : "Save failed.");
    if (res.ok) setEditing(null);
    setSaving(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    const res = await adminFetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage("Delete failed.");
      return;
    }
    load();
  }

  return (
    <AdminShell title="Testimonials">
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() =>
            setEditing({ quote: "", name: "", role: "", featured: false, published: true, sortOrder: 0 })
          }
          className="bg-cream px-4 py-2 text-xs tracking-[0.15em] text-ink uppercase"
        >
          Add Testimonial
        </button>
      </div>

      {editing && (
        <div className="mb-8 border border-stone/30 p-6">
          <div className="space-y-4">
            <AdminField label="Quote">
              <AdminTextarea
                value={editing.quote || ""}
                onChange={(e) => setEditing({ ...editing, quote: e.target.value })}
              />
            </AdminField>
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Name">
                <AdminInput
                  value={editing.name || ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </AdminField>
              <AdminField label="Role">
                <AdminInput
                  value={editing.role || ""}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                />
              </AdminField>
            </div>
            <AdminField
              label="Featured on homepage"
              hint="Shows in the Client Words section on the homepage. Must also be Published."
            >
              <label className="flex items-center gap-2 text-sm text-fog">
                <input
                  type="checkbox"
                  checked={!!editing.featured}
                  onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                />
                Feature this testimonial on the homepage
              </label>
            </AdminField>
            <label className="flex items-center gap-2 text-sm text-fog">
              <input
                type="checkbox"
                checked={editing.published !== false}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />
              Published
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="bg-cream px-5 py-2 text-xs text-ink uppercase disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="text-xs text-fog">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border border-stone/30 p-4">
            <p className="text-sm text-cream">&ldquo;{item.quote}&rdquo;</p>
            <p className="mt-2 text-xs text-muted">
              — {item.name}, {item.role}
              {item.featured && " · Featured"}
            </p>
            <div className="mt-3 flex gap-3">
              <button type="button" onClick={() => setEditing(item)} className="text-xs text-accent">
                Edit
              </button>
              <button type="button" onClick={() => remove(item.id)} className="text-xs text-red-400">
                Delete
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-12 text-center text-fog">No testimonials yet.</p>
        )}
      </div>
      {message && <p className="mt-6 text-sm text-accent">{message}</p>}
    </AdminShell>
  );
}
