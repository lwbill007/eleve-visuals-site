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
import type {
  AboutContent,
  BookingOptions,
  BookingTermsContent,
  BrandStory,
  ContactPageContent,
  FaqItem,
  HeroContent,
  PageCopy,
  ServicesPageIntro,
  SessionsApplicationContent,
  SessionsContent,
  SiteConfig,
} from "@/lib/types";
import {
  DEFAULT_ABOUT,
  DEFAULT_BOOKING_OPTIONS,
  DEFAULT_BOOKING_TERMS,
  DEFAULT_BRAND_STORY,
  DEFAULT_CONTACT_PAGE,
  DEFAULT_FAQ,
  DEFAULT_HERO,
  DEFAULT_PAGE_COPY,
  DEFAULT_SERVICES_INTRO,
  DEFAULT_SESSIONS,
  DEFAULT_SESSIONS_APPLICATION,
  DEFAULT_SITE_CONFIG,
} from "@/lib/defaults";

const TABS = [
  { id: "site", label: "Site Info" },
  { id: "hero", label: "Homepage Hero" },
  { id: "brand", label: "Brand Story" },
  { id: "about", label: "About" },
  { id: "sessions", label: "ÉLEVÉ Sessions" },
  { id: "booking", label: "Booking" },
  { id: "contact", label: "Contact" },
  { id: "faq", label: "FAQ" },
  { id: "pages", label: "Page Copy" },
] as const;

type TabId = (typeof TABS)[number]["id"];

async function saveContent(key: string, value: unknown) {
  const res = await adminFetch("/api/admin/content", {
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
  const [bookingOptions, setBookingOptions] = useState<BookingOptions>(DEFAULT_BOOKING_OPTIONS);
  const [bookingTerms, setBookingTerms] = useState<BookingTermsContent>(DEFAULT_BOOKING_TERMS);
  const [faq, setFaq] = useState<FaqItem[]>(DEFAULT_FAQ);
  const [sessionsApplication, setSessionsApplication] = useState<SessionsApplicationContent>(
    DEFAULT_SESSIONS_APPLICATION
  );

  useEffect(() => {
    adminFetch("/api/admin/content")
      .then(async (r) => {
        if (!r.ok) {
          setMessage("Failed to load site content.");
          return;
        }
        const all = (await r.json()) as { key: string; value: unknown }[];
        if (!Array.isArray(all)) {
          setMessage("Failed to load site content.");
          return;
        }
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
            case "bookingOptions":
              setBookingOptions(item.value as BookingOptions);
              break;
            case "bookingTerms":
              setBookingTerms(item.value as BookingTermsContent);
              break;
            case "faq":
              setFaq(item.value as FaqItem[]);
              break;
            case "sessionsApplication":
              setSessionsApplication(item.value as SessionsApplicationContent);
              break;
          }
        }
      })
      .catch(() => setMessage("Failed to load site content."));
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
      booking: ["bookingOptions", bookingOptions],
      contact: ["contactPage", contact],
      faq: ["faq", faq],
      pages: ["pageCopy", pageCopy],
    };

    if (tab === "pages") {
      const ok1 = await saveContent("servicesIntro", servicesIntro);
      const ok2 = await saveContent("pageCopy", pageCopy);
      setMessage(ok1 && ok2 ? "Saved." : "Save failed.");
    } else if (tab === "booking") {
      const cleanedOptions = {
        serviceTypes: bookingOptions.serviceTypes.filter(Boolean),
        shootTypes: bookingOptions.shootTypes.filter(Boolean),
        budgetRanges: bookingOptions.budgetRanges.filter(Boolean),
        deliverables: bookingOptions.deliverables.filter(Boolean),
      };
      const ok1 = await saveContent("bookingOptions", cleanedOptions);
      const ok2 = await saveContent("pageCopy", pageCopy);
      const ok3 = await saveContent("bookingTerms", bookingTerms);
      setMessage(ok1 && ok2 && ok3 ? "Saved." : "Save failed.");
    } else if (tab === "sessions") {
      const ok1 = await saveContent("sessions", sessions);
      const ok2 = await saveContent("sessionsApplication", sessionsApplication);
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

          <div className="space-y-4 border-t border-stone/30 pt-8">
            <h3 className="font-display text-lg">Application Form</h3>
            <AdminField label="Headline">
              <AdminInput
                value={sessionsApplication.headline}
                onChange={(e) =>
                  setSessionsApplication({ ...sessionsApplication, headline: e.target.value })
                }
              />
            </AdminField>
            <AdminField label="Subheadline">
              <AdminTextarea
                value={sessionsApplication.subheadline}
                onChange={(e) =>
                  setSessionsApplication({ ...sessionsApplication, subheadline: e.target.value })
                }
              />
            </AdminField>
            <AdminField label="Success title">
              <AdminInput
                value={sessionsApplication.successTitle}
                onChange={(e) =>
                  setSessionsApplication({ ...sessionsApplication, successTitle: e.target.value })
                }
              />
            </AdminField>
            <AdminField label="Success message">
              <AdminTextarea
                value={sessionsApplication.successMessage}
                onChange={(e) =>
                  setSessionsApplication({ ...sessionsApplication, successMessage: e.target.value })
                }
              />
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

      {tab === "booking" && (
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="font-display text-lg">Book Page</h3>
            <AdminField label="Headline">
              <AdminInput
                value={pageCopy.bookPage.headline}
                onChange={(e) =>
                  setPageCopy({
                    ...pageCopy,
                    bookPage: { ...pageCopy.bookPage, headline: e.target.value },
                  })
                }
              />
            </AdminField>
            <AdminField label="Subheadline">
              <AdminTextarea
                value={pageCopy.bookPage.subheadline}
                onChange={(e) =>
                  setPageCopy({
                    ...pageCopy,
                    bookPage: { ...pageCopy.bookPage, subheadline: e.target.value },
                  })
                }
              />
            </AdminField>
            {pageCopy.bookPage.notes.map((note, index) => (
              <AdminField key={index} label={`Pre-submit note ${index + 1}`}>
                <AdminInput
                  value={note}
                  onChange={(e) => {
                    const notes = [...pageCopy.bookPage.notes];
                    notes[index] = e.target.value;
                    setPageCopy({
                      ...pageCopy,
                      bookPage: { ...pageCopy.bookPage, notes },
                    });
                  }}
                />
              </AdminField>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="font-display text-lg">Success Message</h3>
            <AdminField label="Title">
              <AdminInput
                value={pageCopy.bookPage.successTitle}
                onChange={(e) =>
                  setPageCopy({
                    ...pageCopy,
                    bookPage: { ...pageCopy.bookPage, successTitle: e.target.value },
                  })
                }
              />
            </AdminField>
            <AdminField label="Message">
              <AdminTextarea
                value={pageCopy.bookPage.successMessage}
                onChange={(e) =>
                  setPageCopy({
                    ...pageCopy,
                    bookPage: { ...pageCopy.bookPage, successMessage: e.target.value },
                  })
                }
              />
            </AdminField>
            {pageCopy.bookPage.nextSteps.map((step, index) => (
              <AdminField key={index} label={`Next step ${index + 1}`}>
                <AdminInput
                  value={step}
                  onChange={(e) => {
                    const nextSteps = [...pageCopy.bookPage.nextSteps];
                    nextSteps[index] = e.target.value;
                    setPageCopy({
                      ...pageCopy,
                      bookPage: { ...pageCopy.bookPage, nextSteps },
                    });
                  }}
                />
              </AdminField>
            ))}
          </div>

          <div className="space-y-6">
            <h3 className="font-display text-lg">Form Options</h3>
            <StringListEditor
              label="Service types"
              items={bookingOptions.serviceTypes}
              onChange={(serviceTypes) => setBookingOptions({ ...bookingOptions, serviceTypes })}
            />
            <StringListEditor
              label="Shoot types"
              items={bookingOptions.shootTypes}
              onChange={(shootTypes) => setBookingOptions({ ...bookingOptions, shootTypes })}
            />
            <StringListEditor
              label="Budget ranges"
              items={bookingOptions.budgetRanges}
              onChange={(budgetRanges) => setBookingOptions({ ...bookingOptions, budgetRanges })}
            />
            <StringListEditor
              label="Deliverables"
              items={bookingOptions.deliverables}
              onChange={(deliverables) => setBookingOptions({ ...bookingOptions, deliverables })}
            />
          </div>

          <div className="space-y-4 border-t border-stone/30 pt-8">
            <h3 className="font-display text-lg">Booking Terms Page</h3>
            <AdminField label="Headline">
              <AdminInput
                value={bookingTerms.headline}
                onChange={(e) => setBookingTerms({ ...bookingTerms, headline: e.target.value })}
              />
            </AdminField>
            <AdminField label="Intro">
              <AdminTextarea
                value={bookingTerms.intro}
                onChange={(e) => setBookingTerms({ ...bookingTerms, intro: e.target.value })}
              />
            </AdminField>
            {bookingTerms.sections.map((section, index) => (
              <div key={index} className="space-y-3 border border-stone/20 p-4">
                <AdminField label={`Section ${index + 1} title`}>
                  <AdminInput
                    value={section.title}
                    onChange={(e) => {
                      const sections = [...bookingTerms.sections];
                      sections[index] = { ...sections[index], title: e.target.value };
                      setBookingTerms({ ...bookingTerms, sections });
                    }}
                  />
                </AdminField>
                <AdminField label="Body">
                  <AdminTextarea
                    value={section.body}
                    onChange={(e) => {
                      const sections = [...bookingTerms.sections];
                      sections[index] = { ...sections[index], body: e.target.value };
                      setBookingTerms({ ...bookingTerms, sections });
                    }}
                  />
                </AdminField>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "faq" && (
        <div className="space-y-6">
          {faq.map((item, index) => (
            <div key={index} className="space-y-3 border border-stone/20 p-4">
              <AdminField label={`Question ${index + 1}`}>
                <AdminInput
                  value={item.question}
                  onChange={(e) => {
                    const next = [...faq];
                    next[index] = { ...next[index], question: e.target.value };
                    setFaq(next);
                  }}
                />
              </AdminField>
              <AdminField label="Answer">
                <AdminTextarea
                  value={item.answer}
                  onChange={(e) => {
                    const next = [...faq];
                    next[index] = { ...next[index], answer: e.target.value };
                    setFaq(next);
                  }}
                />
              </AdminField>
            </div>
          ))}
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
