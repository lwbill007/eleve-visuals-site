"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
  ImageUpload,
  SaveBar,
  StringListEditor,
} from "@/components/admin/AdminForm";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { useAdminToast } from "@/components/admin/AdminToast";
import { adminFetch } from "@/lib/admin-fetch";
import { saveAdminContent } from "@/lib/admin-save";
import { DEFAULT_ABOUT } from "@/lib/defaults";
import { useAutosave, useDirtyTracker, useUnsavedChangesWarning } from "@/hooks/useAdminEditor";
import type { AboutContent } from "@/lib/types";

export default function AdminAboutPage() {
  const { toast } = useAdminToast();
  const [about, setAbout] = useState<AboutContent>(DEFAULT_ABOUT);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(DEFAULT_ABOUT));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [autosaveNote, setAutosaveNote] = useState("");

  const dirty = useDirtyTracker(savedSnapshot, about);
  useUnsavedChangesWarning(dirty);

  useEffect(() => {
    adminFetch("/api/admin/content")
      .then((r) => r.json())
      .then((items: { key: string; value: unknown }[]) => {
        const item = items.find((c) => c.key === "about");
        if (item?.value) {
          const merged = { ...DEFAULT_ABOUT, ...(item.value as AboutContent) };
          setAbout(merged);
          setSavedSnapshot(JSON.stringify(merged));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async () => {
    setSaving(true);
    const ok = await saveAdminContent("about", about);
    if (ok) {
      setSavedSnapshot(JSON.stringify(about));
      setAutosaveNote("Autosaved");
      if (!message) toast("About page saved.");
    }
    setMessage(ok ? "Saved." : "Save failed.");
    setSaving(false);
    return ok;
  }, [about, message, toast]);

  useAutosave(dirty, async () => {
    const ok = await saveAdminContent("about", about);
    if (ok) {
      setSavedSnapshot(JSON.stringify(about));
      setAutosaveNote(`Autosaved at ${new Date().toLocaleTimeString()}`);
    }
    return ok;
  });

  if (loading) {
    return (
      <AdminShell title="About Page">
        <AdminPageSkeleton rows={6} />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="About Page">
      <div className="space-y-10">
        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Hero</h2>
          <div className="space-y-4">
            <AdminField label="Headline">
              <AdminInput value={about.headline} onChange={(e) => setAbout({ ...about, headline: e.target.value })} />
            </AdminField>
            <AdminField label="Intro">
              <AdminTextarea value={about.intro} onChange={(e) => setAbout({ ...about, intro: e.target.value })} />
            </AdminField>
            {about.story.map((p, i) => (
              <AdminField key={i} label={`Story paragraph ${i + 1}`}>
                <AdminTextarea
                  value={p}
                  onChange={(e) => {
                    const story = [...about.story];
                    story[i] = e.target.value;
                    setAbout({ ...about, story });
                  }}
                />
              </AdminField>
            ))}
            <ImageUpload label="Portrait image" value={about.image} onChange={(url) => setAbout({ ...about, image: url })} />
            <AdminField label="Image alt text">
              <AdminInput value={about.imageAlt} onChange={(e) => setAbout({ ...about, imageAlt: e.target.value })} />
            </AdminField>
          </div>
        </section>

        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Philosophy</h2>
          <AdminField label="Section headline">
            <AdminInput
              value={about.philosophy.headline}
              onChange={(e) =>
                setAbout({ ...about, philosophy: { ...about.philosophy, headline: e.target.value } })
              }
            />
          </AdminField>
          {about.philosophy.pillars.map((pillar, i) => (
            <div key={i} className="mt-4 space-y-3 border border-stone/20 p-4">
              <AdminField label={`Pillar ${i + 1} title`}>
                <AdminInput
                  value={pillar.title}
                  onChange={(e) => {
                    const pillars = [...about.philosophy.pillars];
                    pillars[i] = { ...pillars[i], title: e.target.value };
                    setAbout({ ...about, philosophy: { ...about.philosophy, pillars } });
                  }}
                />
              </AdminField>
              <AdminField label="Description">
                <AdminTextarea
                  value={pillar.description}
                  onChange={(e) => {
                    const pillars = [...about.philosophy.pillars];
                    pillars[i] = { ...pillars[i], description: e.target.value };
                    setAbout({ ...about, philosophy: { ...about.philosophy, pillars } });
                  }}
                />
              </AdminField>
            </div>
          ))}
        </section>

        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Process</h2>
          <AdminField label="Section headline">
            <AdminInput
              value={about.process.headline}
              onChange={(e) =>
                setAbout({ ...about, process: { ...about.process, headline: e.target.value } })
              }
            />
          </AdminField>
          {about.process.steps.map((step, i) => (
            <div key={i} className="mt-4 grid gap-3 border border-stone/20 p-4 md:grid-cols-3">
              <AdminField label="Step #">
                <AdminInput
                  value={step.step}
                  onChange={(e) => {
                    const steps = [...about.process.steps];
                    steps[i] = { ...steps[i], step: e.target.value };
                    setAbout({ ...about, process: { ...about.process, steps } });
                  }}
                />
              </AdminField>
              <AdminField label="Title">
                <AdminInput
                  value={step.title}
                  onChange={(e) => {
                    const steps = [...about.process.steps];
                    steps[i] = { ...steps[i], title: e.target.value };
                    setAbout({ ...about, process: { ...about.process, steps } });
                  }}
                />
              </AdminField>
              <div className="md:col-span-3">
                <AdminField label="Description">
                  <AdminTextarea
                    value={step.description}
                    onChange={(e) => {
                      const steps = [...about.process.steps];
                      steps[i] = { ...steps[i], description: e.target.value };
                      setAbout({ ...about, process: { ...about.process, steps } });
                    }}
                  />
                </AdminField>
              </div>
            </div>
          ))}
        </section>

        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Trust / Experience</h2>
          <AdminField label="Section headline">
            <AdminInput
              value={about.trust.headline}
              onChange={(e) =>
                setAbout({ ...about, trust: { ...about.trust, headline: e.target.value } })
              }
            />
          </AdminField>
          <StringListEditor
            label="Trust points"
            items={about.trust.points}
            onChange={(points) => setAbout({ ...about, trust: { ...about.trust, points } })}
          />
        </section>
      </div>

      <SaveBar
        onSave={() => void persist()}
        saving={saving}
        message={message}
        autosaveNote={dirty ? autosaveNote || "Unsaved changes — autosave pending" : autosaveNote}
      />
    </AdminShell>
  );
}
