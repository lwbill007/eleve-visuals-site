"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
  SaveBar,
  StringListEditor,
} from "@/components/admin/AdminForm";
import type {
  BookingOptions,
  BookingTermsContent,
  BrandStory,
  FaqItem,
  PageCopy,
  ServicesPageIntro,
} from "@/lib/types";
import {
  DEFAULT_BOOKING_OPTIONS,
  DEFAULT_BOOKING_TERMS,
  DEFAULT_BRAND_STORY,
  DEFAULT_FAQ,
  DEFAULT_PAGE_COPY,
  DEFAULT_SERVICES_INTRO,
} from "@/lib/defaults";

const TABS = [
  { id: "brand", label: "Brand Story" },
  { id: "booking", label: "Booking" },
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
  const [tab, setTab] = useState<TabId>("brand");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [brandStory, setBrandStory] = useState<BrandStory>(DEFAULT_BRAND_STORY);
  const [servicesIntro, setServicesIntro] = useState<ServicesPageIntro>(DEFAULT_SERVICES_INTRO);
  const [pageCopy, setPageCopy] = useState<PageCopy>(DEFAULT_PAGE_COPY);
  const [bookingOptions, setBookingOptions] = useState<BookingOptions>(DEFAULT_BOOKING_OPTIONS);
  const [bookingTerms, setBookingTerms] = useState<BookingTermsContent>(DEFAULT_BOOKING_TERMS);
  const [faq, setFaq] = useState<FaqItem[]>(DEFAULT_FAQ);

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
            case "brandStory":
              setBrandStory(item.value as BrandStory);
              break;
            case "servicesIntro":
              setServicesIntro(item.value as ServicesPageIntro);
              break;
            case "pageCopy":
              setPageCopy(item.value as PageCopy);
              break;
            case "bookingOptions":
              setBookingOptions({
                ...DEFAULT_BOOKING_OPTIONS,
                ...(item.value as BookingOptions),
              });
              break;
            case "bookingTerms":
              setBookingTerms(item.value as BookingTermsContent);
              break;
            case "faq":
              setFaq(item.value as FaqItem[]);
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
      brand: ["brandStory", brandStory],
      booking: ["bookingOptions", bookingOptions],
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
        sessionSettings: bookingOptions.sessionSettings.filter(Boolean),
        durations: bookingOptions.durations.filter(Boolean),
        budgetRanges: bookingOptions.budgetRanges.filter(Boolean),
        deliverables: bookingOptions.deliverables.filter(Boolean),
        referralSources: bookingOptions.referralSources.filter(Boolean),
      };
      const ok1 = await saveContent("bookingOptions", cleanedOptions);
      const ok2 = await saveContent("pageCopy", pageCopy);
      const ok3 = await saveContent("bookingTerms", bookingTerms);
      setMessage(ok1 && ok2 && ok3 ? "Saved." : "Save failed.");
    } else {
      const [key, value] = map[tab];
      const ok = await saveContent(key, value);
      setMessage(ok ? "Saved." : "Save failed.");
    }
    setSaving(false);
  }

  return (
    <AdminShell title="Page Copy & Forms">
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
              label="Session settings"
              items={bookingOptions.sessionSettings}
              onChange={(sessionSettings) =>
                setBookingOptions({ ...bookingOptions, sessionSettings })
              }
            />
            <StringListEditor
              label="Durations"
              items={bookingOptions.durations}
              onChange={(durations) => setBookingOptions({ ...bookingOptions, durations })}
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
            <StringListEditor
              label="Referral sources"
              items={bookingOptions.referralSources}
              onChange={(referralSources) =>
                setBookingOptions({ ...bookingOptions, referralSources })
              }
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
