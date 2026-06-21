"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
  ImageUpload,
} from "@/components/admin/AdminForm";
import type { ServiceDTO } from "@/lib/types";

export default function AdminServicesPage() {
  const [items, setItems] = useState<ServiceDTO[]>([]);
  const [editing, setEditing] = useState<ServiceDTO | null>(null);
  const [includesText, setIncludesText] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/services");
    setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(item: ServiceDTO) {
    setEditing(item);
    setIncludesText(item.includes.join("\n"));
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    const payload = {
      ...editing,
      includes: includesText.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    await fetch(`/api/admin/services/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setEditing(null);
    setSaving(false);
    load();
  }

  return (
    <AdminShell title="Services">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => startEdit(item)}
              className={`w-full border p-4 text-left transition-colors ${
                editing?.id === item.id
                  ? "border-accent bg-charcoal/50"
                  : "border-stone/30 hover:border-stone/60"
              }`}
            >
              <p className="text-sm text-cream">{item.title}</p>
              <p className="text-xs text-muted">{item.startingPrice}</p>
            </button>
          ))}
        </div>

        {editing && (
          <div className="border border-stone/30 p-6 lg:sticky lg:top-24 lg:self-start">
            <h2 className="mb-6 font-display text-xl">{editing.title}</h2>
            <div className="space-y-4">
              <AdminField label="Tagline">
                <AdminInput
                  value={editing.tagline}
                  onChange={(e) => setEditing({ ...editing, tagline: e.target.value })}
                />
              </AdminField>
              <AdminField label="Description">
                <AdminTextarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </AdminField>
              <AdminField label="Who it's for">
                <AdminTextarea
                  value={editing.forWhom}
                  onChange={(e) => setEditing({ ...editing, forWhom: e.target.value })}
                />
              </AdminField>
              <AdminField label="Starting Price">
                <AdminInput
                  value={editing.startingPrice}
                  onChange={(e) => setEditing({ ...editing, startingPrice: e.target.value })}
                />
              </AdminField>
              <AdminField label="What's included (one per line)">
                <AdminTextarea
                  value={includesText}
                  onChange={(e) => setIncludesText(e.target.value)}
                  rows={6}
                />
              </AdminField>
              <ImageUpload
                label="Service Image"
                value={editing.image}
                onChange={(url) => setEditing({ ...editing, image: url })}
              />
              <label className="flex items-center gap-2 text-sm text-fog">
                <input
                  type="checkbox"
                  checked={editing.published}
                  onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                />
                Published
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
    </AdminShell>
  );
}
