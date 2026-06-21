"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
  ImageUpload,
  SaveBar,
} from "@/components/admin/AdminForm";
import type {
  AboutContent,
  BrandStory,
  ContactPageContent,
  HeroContent,
  PageCopy,
  ServicesPageIntro,
  SessionsContent,
  SiteConfig,
} from "@/lib/types";
import {
  DEFAULT_ABOUT,
  DEFAULT_BRAND_STORY,
  DEFAULT_CONTACT_PAGE,
  DEFAULT_HERO,
  DEFAULT_PAGE_COPY,
  DEFAULT_SERVICES_INTRO,
  DEFAULT_SESSIONS,
  DEFAULT_SITE_CONFIG,
} from "@/lib/defaults";

const TABS = [
  { id: "site", label: "Site Info" },
  { id: "hero", label: "Homepage Hero" },
  { id: "brand", label: "Brand Story" },
  { id: "about", label: "About" },
  { id: "sessions", label: "ÉLEVÉ Sessions" },
  { id: "contact", label: "Contact" },
  { id: "pages", label: "Page Copy" },
] as const;

type TabId = (typeof TABS)[number]["id"];

async function saveContent(key: string, value: unknown) {
  const res = await fetch("/api/admin/content", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  return res.ok;
}

export default function AdminContentPage() {
  const [tab, setTab] = useState<TabId>("site");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [hero, setHero] = useState<HeroContent>(DEFAULT_HERO);
  const [brandStory, setBrandStory] = useState<BrandStory>(DEFAULT_BRAND_STORY);
  const [about, setAbout] = useState<AboutContent>(DEFAULT_ABOUT);
  const [sessions, setSessions] = useState<SessionsContent>(DEFAULT_SESSIONS);
  const [contact, setContact] = useState<ContactPageContent>(DEFAULT_CONTACT_PAGE);
  const [servicesIntro, setServicesIntro] = useState<ServicesPageIntro>(DEFAULT_SERVICES_INTRO);
  const [pageCopy, setPageCopy] = useState<PageCopy>(DEFAULT_PAGE_COPY);

  useEffect(() => {
    fetch("/api/admin/content")
      .then((r) => r.json())
      .then((all: { key: string; value: unknown }[]) => {
        for (const item of all) {
          switch (item.key) {
            case "siteConfig":
              setSiteConfig(item.value as SiteConfig);
              break;
            case "hero":
              setHero(item.value as HeroContent);
              break;
            case "brandStory":
              setBrandStory(item.value as BrandStory);
              break;
            case "about":
              setAbout(item.value as AboutContent);
              break;
            case "sessions":
              setSessions(item.value as SessionsContent);
              break;
            case "contactPage":
              setContact(item.value as ContactPageContent);
              break;
            case "servicesIntro":
              setServicesIntro(item.value as ServicesPageIntro);
              break;
            case "pageCopy":
              setPageCopy(item.value as PageCopy);
              break;
          }
        }
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const map: Record<TabId, [string, unknown]> = {
      site: ["siteConfig", siteConfig],
      hero: ["hero", hero],
      brand: ["brandStory", brandStory],
      about: ["about", about],
      sessions: ["sessions", sessions],
      contact: ["contactPage", contact],
      pages: ["pageCopy", pageCopy],
    };

    if (tab === "pages") {
      const ok1 = await saveContent("servicesIntro", servicesIntro);
      const ok2 = await saveContent("pageCopy", pageCopy);
      setMessage(ok1 && ok2 ? "Saved." : "Save failed.");
    } else {
      const [key, value] = map[tab];
      const ok = await saveContent(key, value);
      setMessage(ok ? "Saved." : "Save failed.");
    }
    setSaving(false);
  }

  return (
    <AdminShell title="Site Content">
      <div className="mb-8 flex flex-wrap gap-2 border-b border-stone/30 pb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs tracking-[0.1em] uppercase ${
              tab === t.id ? "bg-charcoal text-cream" : "text-fog hover:text-cream"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "site" && (
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Email">
            <AdminInput value={siteConfig.email} onChange={(e) => setSiteConfig({ ...siteConfig, email: e.target.value })} />
          </AdminField>
          <AdminField label="Instagram Handle">
            <AdminInput value={siteConfig.instagram} onChange={(e) => setSiteConfig({ ...siteConfig, instagram: e.target.value })} />
          </AdminField>
          <AdminField label="Instagram URL">
            <AdminInput value={siteConfig.instagramUrl} onChange={(e) => setSiteConfig({ ...siteConfig, instagramUrl: e.target.value })} />
          </AdminField>
          <AdminField label="Location">
            <AdminInput value={siteConfig.location} onChange={(e) => setSiteConfig({ ...siteConfig, location: e.target.value })} />
          </AdminField>
          <div className="md:col-span-2">
            <AdminField label="Tagline">
              <AdminInput value={siteConfig.tagline} onChange={(e) => setSiteConfig({ ...siteConfig, tagline: e.target.value })} />
            </AdminField>
          </div>
          <div className="md:col-span-2">
            <AdminField label="Site Description (SEO)">
              <AdminTextarea value={siteConfig.description} onChange={(e) => setSiteConfig({ ...siteConfig, description: e.target.value })} />
            </AdminField>
          </div>
        </div>
      )}

      {tab === "hero" && (
        <div className="space-y-4">
          <AdminField label="Headline">
            <AdminInput value={hero.headline} onChange={(e) => setHero({ ...hero, headline: e.target.value })} />
          </AdminField>
          <AdminField label="Subheadline">
            <AdminTextarea value={hero.subheadline} onChange={(e) => setHero({ ...hero, subheadline: e.target.value })} />
          </AdminField>
          <ImageUpload label="Hero Background" value={hero.image} onChange={(url) => setHero({ ...hero, image: url })} />
          <AdminField label="Image Alt Text">
            <AdminInput value={hero.imageAlt} onChange={(e) => setHero({ ...hero, imageAlt: e.target.value })} />
          </AdminField>
        </div>
      )}

      {tab === "brand" && (
        <div className="space-y-4">
          <AdminField label="Eyebrow">
            <AdminInput value={brandStory.eyebrow} onChange={(e) => setBrandStory({ ...brandStory, eyebrow: e.target.value })} />
          </AdminField>
          <AdminField label="Headline">
            <AdminInput value={brandStory.headline} onChange={(e) => setBrandStory({ ...brandStory, headline: e.target.value })} />
          </AdminField>
          {brandStory.body.map((p, i) => (
            <AdminField key={i} label={`Paragraph ${i + 1}`}>
              <AdminTextarea
                value={p}
                onChange={(e) => {
                  const body = [...brandStory.body];
                  body[i] = e.target.value;
                  setBrandStory({ ...brandStory, body });
                }}
              />
            </AdminField>
          ))}
        </div>
      )}

      {tab === "about" && (
        <div className="space-y-4">
          <AdminField label="Headline">
            <AdminInput value={about.headline} onChange={(e) => setAbout({ ...about, headline: e.target.value })} />
          </AdminField>
          <AdminField label="Intro">
            <AdminTextarea value={about.intro} onChange={(e) => setAbout({ ...about, intro: e.target.value })} />
          </AdminField>
          {about.story.map((p, i) => (
            <AdminField key={i} label={`Story ${i + 1}`}>
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
          <ImageUpload label="About Photo" value={about.image} onChange={(url) => setAbout({ ...about, image: url })} />
        </div>
      )}

      {tab === "sessions" && (
        <div className="space-y-4">
          <AdminField label="Theme">
            <AdminInput value={sessions.theme} onChange={(e) => setSessions({ ...sessions, theme: e.target.value })} />
          </AdminField>
          <AdminField label="Theme Description">
            <AdminTextarea value={sessions.themeDescription} onChange={(e) => setSessions({ ...sessions, themeDescription: e.target.value })} />
          </AdminField>
          <ImageUpload label="Sessions Hero" value={sessions.heroImage} onChange={(url) => setSessions({ ...sessions, heroImage: url })} />
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField label="Date">
              <AdminInput value={sessions.eventDetails.date} onChange={(e) => setSessions({ ...sessions, eventDetails: { ...sessions.eventDetails, date: e.target.value } })} />
            </AdminField>
            <AdminField label="Time">
              <AdminInput value={sessions.eventDetails.time} onChange={(e) => setSessions({ ...sessions, eventDetails: { ...sessions.eventDetails, time: e.target.value } })} />
            </AdminField>
            <AdminField label="Location">
              <AdminInput value={sessions.eventDetails.location} onChange={(e) => setSessions({ ...sessions, eventDetails: { ...sessions.eventDetails, location: e.target.value } })} />
            </AdminField>
            <AdminField label="Capacity">
              <AdminInput value={sessions.eventDetails.capacity} onChange={(e) => setSessions({ ...sessions, eventDetails: { ...sessions.eventDetails, capacity: e.target.value } })} />
            </AdminField>
          </div>
        </div>
      )}

      {tab === "contact" && (
        <div className="space-y-4">
          <AdminField label="Headline">
            <AdminInput value={contact.headline} onChange={(e) => setContact({ ...contact, headline: e.target.value })} />
          </AdminField>
          <AdminField label="Subheadline">
            <AdminTextarea value={contact.subheadline} onChange={(e) => setContact({ ...contact, subheadline: e.target.value })} />
          </AdminField>
          <AdminField label="Calendar URL (Calendly, etc.)" hint="Leave empty to hide">
            <AdminInput value={contact.calendarUrl || ""} onChange={(e) => setContact({ ...contact, calendarUrl: e.target.value || null })} />
          </AdminField>
        </div>
      )}

      {tab === "pages" && (
        <div className="space-y-6">
          <div>
            <h3 className="mb-4 font-display text-lg">Services Page</h3>
            <AdminField label="Headline">
              <AdminInput value={servicesIntro.headline} onChange={(e) => setServicesIntro({ ...servicesIntro, headline: e.target.value })} />
            </AdminField>
            <AdminField label="Subheadline">
              <AdminTextarea value={servicesIntro.subheadline} onChange={(e) => setServicesIntro({ ...servicesIntro, subheadline: e.target.value })} />
            </AdminField>
          </div>
          <div>
            <h3 className="mb-4 font-display text-lg">Homepage CTA</h3>
            <AdminField label="Headline">
              <AdminInput value={pageCopy.homeCta.headline} onChange={(e) => setPageCopy({ ...pageCopy, homeCta: { ...pageCopy.homeCta, headline: e.target.value } })} />
            </AdminField>
          </div>
        </div>
      )}

      <SaveBar onSave={handleSave} saving={saving} message={message} />
    </AdminShell>
  );
}
