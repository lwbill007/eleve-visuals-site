"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminField, AdminInput, AdminTextarea, SaveBar } from "@/components/admin/AdminForm";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { useAdminToast } from "@/components/admin/AdminToast";
import { adminFetch } from "@/lib/admin-fetch";
import { saveAdminContent } from "@/lib/admin-save";
import { DEFAULT_EXPERIENCE } from "@/lib/defaults";
import { useAdminEditor } from "@/hooks/useAdminEditor";
import type { ExperienceContent } from "@/lib/types";

export default function AdminExperiencePage() {
  const { toast } = useAdminToast();
  const [experience, setExperience] = useState<ExperienceContent>(DEFAULT_EXPERIENCE);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const editor = useAdminEditor(
    experience,
    (next) => saveAdminContent("experience", next),
    { autosave: true }
  );
  const resetEditor = editor.reset;

  useEffect(() => {
    adminFetch("/api/admin/content")
      .then((r) => r.json())
      .then((items: { key: string; value: unknown }[]) => {
        const item = items.find((c) => c.key === "experience");
        if (item?.value) {
          const merged = { ...DEFAULT_EXPERIENCE, ...(item.value as ExperienceContent) };
          setExperience(merged);
          resetEditor(merged);
        }
      })
      .finally(() => setLoading(false));
  }, [resetEditor]);

  async function persist() {
    const ok = await editor.save();
    if (ok) toast("Experience page saved.");
    setMessage(ok ? "Saved." : "Save failed.");
    return ok;
  }

  if (loading) {
    return (
      <AdminShell title="Experience Page">
        <AdminPageSkeleton rows={6} />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Experience Page">
      <div className="space-y-10">
        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Hero</h2>
          <div className="space-y-4">
            <AdminField label="Headline">
              <AdminInput
                value={experience.headline}
                onChange={(e) => setExperience({ ...experience, headline: e.target.value })}
              />
            </AdminField>
            <AdminField label="Subheadline">
              <AdminTextarea
                value={experience.subheadline}
                onChange={(e) => setExperience({ ...experience, subheadline: e.target.value })}
              />
            </AdminField>
          </div>
        </section>

        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Stages</h2>
          <p className="mb-4 text-sm text-fog">
            The full client journey, shown in order on /experience. Also feeds the shortened
            teasers on the homepage and services page.
          </p>
          {experience.stages.map((stage, i) => (
            <div key={i} className="mt-4 grid gap-3 border border-stone/20 p-4 md:grid-cols-3">
              <AdminField label="Step #">
                <AdminInput
                  value={stage.step}
                  onChange={(e) => {
                    const stages = [...experience.stages];
                    stages[i] = { ...stages[i], step: e.target.value };
                    setExperience({ ...experience, stages });
                  }}
                />
              </AdminField>
              <div className="md:col-span-2">
                <AdminField label="Title">
                  <AdminInput
                    value={stage.title}
                    onChange={(e) => {
                      const stages = [...experience.stages];
                      stages[i] = { ...stages[i], title: e.target.value };
                      setExperience({ ...experience, stages });
                    }}
                  />
                </AdminField>
              </div>
              <div className="md:col-span-3">
                <AdminField label="Description">
                  <AdminTextarea
                    value={stage.description}
                    onChange={(e) => {
                      const stages = [...experience.stages];
                      stages[i] = { ...stages[i], description: e.target.value };
                      setExperience({ ...experience, stages });
                    }}
                  />
                </AdminField>
              </div>
            </div>
          ))}
        </section>
      </div>

      <SaveBar
        onSave={() => void persist()}
        saving={editor.saving}
        message={message}
        autosaveNote={
          editor.status === "dirty"
            ? "Unsaved changes — autosave pending"
            : editor.status === "saved"
              ? "All changes saved"
              : undefined
        }
      />
    </AdminShell>
  );
}
