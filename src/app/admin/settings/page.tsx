"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminField,
  AdminInput,
  ImageUpload,
  SaveBar,
  StringListEditor,
} from "@/components/admin/AdminForm";
import { OsCapabilityGrid, type OsCapability } from "@/components/admin/os/OsCapabilityGrid";
import { WorkspaceChrome } from "@/components/admin/os/WorkspaceFrame";
import { adminFetch } from "@/lib/admin-fetch";
import { saveAdminContent } from "@/lib/admin-save";
import { DEFAULT_BRAND_COLORS, DEFAULT_NAVIGATION, DEFAULT_SITE_CONFIG } from "@/lib/defaults";
import { METRIC_OWNERS } from "@/lib/ai/platform/metric-owners";
import type { BrandColors, NavigationConfig, SiteConfig } from "@/lib/types";

function DomainSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border border-stone/30 p-6">
      <h2 className="mb-6 font-display text-xl text-cream">{title}</h2>
      {children}
    </section>
  );
}

export default function AdminSettingsPage() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [navigation, setNavigation] = useState<NavigationConfig>(DEFAULT_NAVIGATION);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [access, setAccess] = useState<{
    session: { role: string; email?: string; name?: string } | null;
    roles: string[];
    note: string;
  } | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/auth/session-info")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAccess(d));
  }, []);

  useEffect(() => {
    adminFetch("/api/admin/content")
      .then((r) => r.json())
      .then((items: { key: string; value: unknown }[]) => {
        for (const item of items) {
          if (item.key === "siteConfig") {
            const merged = {
              ...DEFAULT_SITE_CONFIG,
              ...(item.value as SiteConfig),
              brandColors: {
                ...DEFAULT_BRAND_COLORS,
                ...((item.value as SiteConfig).brandColors ?? {}),
              },
            };
            setSiteConfig(merged);
          }
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

  const owner = METRIC_OWNERS.settings;
  const domainMap: OsCapability[] = [
    {
      id: "organization",
      label: "Organization",
      status: "live",
      summary: "Site name, contact, hours, social handles — editable below.",
      href: "#organization",
    },
    {
      id: "team",
      label: "Team & Permissions",
      status: "partial",
      summary: access
        ? `Signed in as ${access.session?.role ?? "—"}. Role ladder visible; invite UI not shipped.`
        : "Session role info loading…",
      href: "#team",
    },
    {
      id: "branding",
      label: "Branding",
      status: "live",
      summary: "Colors, logo, SEO assets, and navigation editors live below.",
      href: "#branding",
    },
    {
      id: "integrations",
      label: "Integrations",
      status: "planned",
      summary: "Third-party connectors are not configurable here yet.",
      missing: {
        label: "Integrations",
        reason: "No unified integrations registry on Settings",
        required: ["Connector catalog", "OAuth / API key vault", "Health probes"],
        confidence: 0,
        unlockAfter: "Unlock after connector registry ships",
        owner,
        unlockHref: "/admin/qa",
      },
    },
    {
      id: "ai-providers",
      label: "AI Providers & Routing",
      status: "partial",
      summary: "Live routing telemetry lives in AI Operations — not editable here.",
      href: "/admin/ai-operations",
    },
    {
      id: "security",
      label: "Security",
      status: "planned",
      summary: "Security policies are not configurable on this page yet.",
      missing: {
        label: "Security",
        reason: "No security policy editor (SSO, session, IP allowlist)",
        required: ["Auth policy model", "Session controls", "Audit of policy changes"],
        confidence: 0,
        unlockAfter: "Unlock after security policy surface ships",
        owner,
        unlockHref: "/admin/qa",
      },
    },
    {
      id: "billing",
      label: "Billing",
      status: "partial",
      summary: "Settled cash is owned by Financial Center — no plan/billing editor here.",
      href: "/admin/financial",
    },
    {
      id: "apis",
      label: "APIs & Webhooks",
      status: "partial",
      summary: "Outbound notification webhooks live under Notifications.",
      href: "/admin/notifications",
    },
    {
      id: "backups",
      label: "Backups",
      status: "planned",
      summary: "Backup schedule and restore are not configurable yet.",
      missing: {
        label: "Backups",
        reason: "No backup schedule or restore controls in Settings",
        required: ["Backup job", "Retention policy", "Restore runbook"],
        confidence: 0,
        unlockAfter: "Unlock after backup jobs ship",
        owner,
        unlockHref: "/admin/qa",
      },
    },
    {
      id: "audit",
      label: "Audit Logs",
      status: "partial",
      summary: "Notification activity log exists; full OS audit trail not centralized here.",
      href: "/admin/notifications",
    },
    {
      id: "flags",
      label: "Feature Flags",
      status: "planned",
      summary: "No feature-flag console yet.",
      missing: {
        label: "Feature Flags",
        reason: "Feature flags are not editable in Settings",
        required: ["Flag registry", "Per-environment overrides", "Audit of flag changes"],
        confidence: 0,
        unlockAfter: "Unlock after feature-flag service ships",
        owner,
        unlockHref: "/admin/qa",
      },
    },
    {
      id: "devtools",
      label: "Developer Tools",
      status: "planned",
      summary: "Dev tooling console is not exposed in Settings.",
      missing: {
        label: "Developer Tools",
        reason: "No developer tools panel (API keys, sandbox, debug)",
        required: ["API key management", "Sandbox toggles", "Debug export"],
        confidence: 0,
        unlockAfter: "Unlock after developer tools surface ships",
        owner,
        unlockHref: "/admin/qa",
      },
    },
  ];

  return (
    <AdminShell title="Settings">
      <WorkspaceChrome
        eyebrow="Trust · How is the OS configured?"
        title="Settings"
        description="Clear configuration domains. Live editors for Organization and Branding; everything else shows MissingMetric until configurable — never invent controls."
        related={[
          { label: "Executive QA", href: "/admin/qa", desc: "Gaps" },
          { label: "Notifications", href: "/admin/notifications", desc: "Alerts" },
          { label: "AI Operations", href: "/admin/ai-operations", desc: "Providers" },
          { label: "Financial Center", href: "/admin/financial", desc: "Billing cash" },
        ]}
      >
        <OsCapabilityGrid
          title="Configuration domains"
          subtitle="Jump to live editors or see unlock criteria for domains not yet configurable."
          capabilities={domainMap}
          className="mb-10"
        />

        <div className="mb-8 flex flex-wrap gap-2 text-[0.65rem]">
          {[
            ["organization", "Organization"],
            ["team", "Team"],
            ["branding", "Branding"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={`#${href}`}
              className="rounded-full border border-stone/30 px-3 py-1 text-fog hover:border-accent/40 hover:text-cream"
            >
              {label}
            </a>
          ))}
          <Link
            href="/admin/ai-operations"
            className="rounded-full border border-stone/30 px-3 py-1 text-fog hover:border-accent/40 hover:text-cream"
          >
            AI Providers
          </Link>
          <Link
            href="/admin/financial"
            className="rounded-full border border-stone/30 px-3 py-1 text-fog hover:border-accent/40 hover:text-cream"
          >
            Billing
          </Link>
        </div>

        <div className="space-y-10">
          <DomainSection id="organization" title="Organization">
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
          </DomainSection>

          <DomainSection id="team" title="Team & Permissions">
            {access ? (
              <>
                <p className="mb-4 text-sm text-fog">{access.note}</p>
                <p className="text-sm text-cream">
                  Signed in as{" "}
                  <span className="text-accent">{access.session?.role ?? "—"}</span>
                  {access.session?.email ? ` · ${access.session.email}` : ""}
                </p>
                <p className="mt-2 text-xs text-muted">Ladder: {access.roles.join(" → ")}</p>
                <p className="mt-4 text-xs text-amber-200">
                  Invite / role-edit UI is not configurable yet — see MissingMetric on Team & Permissions above.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">Loading session…</p>
            )}
          </DomainSection>

          <DomainSection id="branding" title="Branding">
            <div className="space-y-10">
              <div>
                <h3 className="mb-4 text-sm text-cream">SEO & Assets</h3>
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
                      onChange={(e) =>
                        setSiteConfig({ ...siteConfig, copyrightText: e.target.value })
                      }
                    />
                  </AdminField>
                  <div className="lg:col-span-2">
                    <AdminField label="SEO Description">
                      <AdminInput
                        value={siteConfig.seoDescription}
                        onChange={(e) =>
                          setSiteConfig({ ...siteConfig, seoDescription: e.target.value })
                        }
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
                  <ImageUpload
                    label="Open Graph Image"
                    value={siteConfig.ogImage}
                    onChange={(url) => setSiteConfig({ ...siteConfig, ogImage: url })}
                  />
                  <AdminField label="Google Analytics ID" hint="e.g. G-XXXXXXXXXX">
                    <AdminInput
                      value={siteConfig.googleAnalyticsId}
                      onChange={(e) =>
                        setSiteConfig({ ...siteConfig, googleAnalyticsId: e.target.value })
                      }
                    />
                  </AdminField>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-sm text-cream">Brand Colors</h3>
                <p className="mb-6 text-sm text-fog">
                  Overrides site-wide CSS color variables. Use hex values (e.g. #b8a88a).
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(DEFAULT_BRAND_COLORS) as (keyof BrandColors)[]).map((key) => (
                    <AdminField key={key} label={key.replace(/([A-Z])/g, " $1")}>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={siteConfig.brandColors[key]}
                          onChange={(e) =>
                            setSiteConfig({
                              ...siteConfig,
                              brandColors: { ...siteConfig.brandColors, [key]: e.target.value },
                            })
                          }
                          className="h-10 w-12 cursor-pointer border border-stone/40 bg-charcoal"
                          aria-label={`${key} color picker`}
                        />
                        <AdminInput
                          value={siteConfig.brandColors[key]}
                          onChange={(e) =>
                            setSiteConfig({
                              ...siteConfig,
                              brandColors: { ...siteConfig.brandColors, [key]: e.target.value },
                            })
                          }
                        />
                      </div>
                    </AdminField>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-sm text-cream">Navigation & Footer</h3>
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
              </div>
            </div>
          </DomainSection>
        </div>

        <SaveBar onSave={handleSave} saving={saving} message={message} />
      </WorkspaceChrome>
    </AdminShell>
  );
}
