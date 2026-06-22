"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminField,
  AdminInput,
  ImageUpload,
  SaveBar,
  StringListEditor,
} from "@/components/admin/AdminForm";
import { adminFetch } from "@/lib/admin-fetch";
import { saveAdminContent } from "@/lib/admin-save";
import { DEFAULT_NAVIGATION, DEFAULT_SITE_CONFIG } from "@/lib/defaults";
import type { NavigationConfig, SiteConfig } from "@/lib/types";

export default function AdminSettingsPage() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [navigation, setNavigation] = useState<NavigationConfig>(DEFAULT_NAVIGATION);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/content")
      .then((r) => r.json())
      .then((items: { key: string; value: unknown }[]) => {
        for (const item of items) {
          if (item.key === "siteConfig")
            setSiteConfig({ ...DEFAULT_SITE_CONFIG, ...(item.value as SiteConfig) });
          if (item.key === "navigation")
            setNavigation({ ...DEFAULT_NAVIGATION, ...(item.value as NavigationConfig) });
        }
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    const results = await Promise.all([
      saveAdminContent("siteConfig", siteConfig),
      saveAdminContent("navigation", navigation),
    ]);
    setMessage(results.every(Boolean) ? "Settings saved." : "Save failed.");
    setSaving(false);
  }

  return (
    <AdminShell title="Site Settings">
      <div className="space-y-10">
        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Brand & Contact</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Site Name">
              <AdminInput
                value={siteConfig.name}
                onChange={(e) => setSiteConfig({ ...siteConfig, name: e.target.value })}
              />
            </AdminField>
            <AdminField label="Creator Name">
              <AdminInput
                value={siteConfig.creator}
                onChange={(e) => setSiteConfig({ ...siteConfig, creator: e.target.value })}
              />
            </AdminField>
            <AdminField label="Email">
              <AdminInput
                value={siteConfig.email}
                onChange={(e) => setSiteConfig({ ...siteConfig, email: e.target.value })}
              />
            </AdminField>
            <AdminField label="Phone">
              <AdminInput
                value={siteConfig.phone}
                onChange={(e) => setSiteConfig({ ...siteConfig, phone: e.target.value })}
              />
            </AdminField>
            <AdminField label="Business Hours">
              <AdminInput
                value={siteConfig.businessHours}
                onChange={(e) => setSiteConfig({ ...siteConfig, businessHours: e.target.value })}
              />
            </AdminField>
            <AdminField label="Response Time">
              <AdminInput
                value={siteConfig.responseTime}
                onChange={(e) => setSiteConfig({ ...siteConfig, responseTime: e.target.value })}
              />
            </AdminField>
            <AdminField label="Instagram Handle">
              <AdminInput
                value={siteConfig.instagram}
                onChange={(e) => setSiteConfig({ ...siteConfig, instagram: e.target.value })}
              />
            </AdminField>
            <AdminField label="Instagram URL">
              <AdminInput
                value={siteConfig.instagramUrl}
                onChange={(e) => setSiteConfig({ ...siteConfig, instagramUrl: e.target.value })}
              />
            </AdminField>
            <AdminField label="TikTok Handle">
              <AdminInput
                value={siteConfig.tiktok}
                onChange={(e) => setSiteConfig({ ...siteConfig, tiktok: e.target.value })}
              />
            </AdminField>
            <AdminField label="TikTok URL">
              <AdminInput
                value={siteConfig.tiktokUrl}
                onChange={(e) => setSiteConfig({ ...siteConfig, tiktokUrl: e.target.value })}
              />
            </AdminField>
          </div>
        </section>

        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">SEO & Assets</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <AdminField label="Default SEO Title">
              <AdminInput
                value={siteConfig.seoTitle}
                onChange={(e) => setSiteConfig({ ...siteConfig, seoTitle: e.target.value })}
              />
            </AdminField>
            <AdminField label="Copyright">
              <AdminInput
                value={siteConfig.copyrightText}
                onChange={(e) => setSiteConfig({ ...siteConfig, copyrightText: e.target.value })}
              />
            </AdminField>
            <div className="lg:col-span-2">
            <AdminField label="SEO Description">
              <AdminInput
                value={siteConfig.seoDescription}
                onChange={(e) => setSiteConfig({ ...siteConfig, seoDescription: e.target.value })}
              />
            </AdminField>
            </div>
            <ImageUpload
              label="Logo"
              value={siteConfig.logo}
              onChange={(url) => setSiteConfig({ ...siteConfig, logo: url })}
            />
            <ImageUpload
              label="Favicon"
              value={siteConfig.favicon}
              onChange={(url) => setSiteConfig({ ...siteConfig, favicon: url })}
            />
          </div>
        </section>

        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Navigation & Footer</h2>
          <StringListEditor
            label="Main navigation links (label|href per line)"
            items={navigation.navLinks.map((l) => `${l.label}|${l.href}`)}
            onChange={(lines) =>
              setNavigation({
                ...navigation,
                navLinks: lines
                  .filter(Boolean)
                  .map((line) => {
                    const [label, href] = line.split("|");
                    return { label: label?.trim() || "", href: href?.trim() || "/" };
                  })
                  .filter((l) => l.label),
              })
            }
          />
          <div className="mt-6">
            <StringListEditor
              label="Footer links (label|href per line)"
              items={navigation.footerLinks.map((l) => `${l.label}|${l.href}`)}
              onChange={(lines) =>
                setNavigation({
                  ...navigation,
                  footerLinks: lines
                    .filter(Boolean)
                    .map((line) => {
                      const [label, href] = line.split("|");
                      return { label: label?.trim() || "", href: href?.trim() || "/" };
                    })
                    .filter((l) => l.label),
                })
              }
            />
          </div>
          <div className="mt-6">
          <AdminField label="Footer Text">
            <AdminInput
              value={navigation.footerText}
              onChange={(e) => setNavigation({ ...navigation, footerText: e.target.value })}
            />
          </AdminField>
          </div>
        </section>
      </div>

      <SaveBar onSave={handleSave} saving={saving} message={message} />
    </AdminShell>
  );
}
