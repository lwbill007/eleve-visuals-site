"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
  SaveBar,
  StringListEditor,
} from "@/components/admin/AdminForm";
import { adminFetch } from "@/lib/admin-fetch";
import { saveAdminContent } from "@/lib/admin-save";
import {
  DEFAULT_BOOKING_OPTIONS,
  DEFAULT_BOOKING_TERMS,
  DEFAULT_PAGE_COPY,
} from "@/lib/defaults";
import type { BookingOptions, BookingTermsContent, PageCopy } from "@/lib/types";

export default function AdminBookingPage() {
  const [bookingOptions, setBookingOptions] = useState<BookingOptions>(DEFAULT_BOOKING_OPTIONS);
  const [bookPage, setBookPage] = useState<PageCopy["bookPage"]>(DEFAULT_PAGE_COPY.bookPage);
  const [bookingTerms, setBookingTerms] = useState<BookingTermsContent>(DEFAULT_BOOKING_TERMS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/content")
      .then((r) => r.json())
      .then((items: { key: string; value: unknown }[]) => {
        for (const item of items) {
          if (item.key === "bookingOptions")
            setBookingOptions({ ...DEFAULT_BOOKING_OPTIONS, ...(item.value as BookingOptions) });
          if (item.key === "pageCopy")
            setBookPage((item.value as PageCopy).bookPage);
          if (item.key === "bookingTerms")
            setBookingTerms(item.value as BookingTermsContent);
        }
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    const pageCopyRes = await adminFetch("/api/admin/content?key=pageCopy");
    const pageCopy = pageCopyRes.ok
      ? (await pageCopyRes.json()).value
      : DEFAULT_PAGE_COPY;
    const results = await Promise.all([
      saveAdminContent("bookingOptions", bookingOptions),
      saveAdminContent("pageCopy", { ...pageCopy, bookPage }),
      saveAdminContent("bookingTerms", bookingTerms),
    ]);
    setMessage(results.every(Boolean) ? "Booking settings saved." : "Save failed.");
    setSaving(false);
  }

  return (
    <AdminShell title="Booking">
      <p className="mb-8 text-sm text-fog">
        Configure the inquiry form and messaging. View submissions in{" "}
        <Link href="/admin/submissions?type=booking" className="text-accent">
          Booking Inquiries
        </Link>
        .
      </p>

      <div className="space-y-10">
        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Form Options</h2>
          <div className="space-y-6">
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
        </section>

        <section className="border border-stone/30 p-6">
          <h2 className="mb-6 font-display text-xl">Booking Page Copy</h2>
          <div className="space-y-4">
            <AdminField label="Headline">
              <AdminInput
                value={bookPage.headline}
                onChange={(e) => setBookPage({ ...bookPage, headline: e.target.value })}
              />
            </AdminField>
            <AdminField label="Subheadline">
              <AdminTextarea
                value={bookPage.subheadline}
                onChange={(e) => setBookPage({ ...bookPage, subheadline: e.target.value })}
              />
            </AdminField>
            <StringListEditor
              label="Trust notes (one per line)"
              items={bookPage.notes}
              onChange={(notes) => setBookPage({ ...bookPage, notes })}
            />
            <AdminField label="Success Title">
              <AdminInput
                value={bookPage.successTitle}
                onChange={(e) => setBookPage({ ...bookPage, successTitle: e.target.value })}
              />
            </AdminField>
            <AdminField label="Success Message">
              <AdminTextarea
                value={bookPage.successMessage}
                onChange={(e) => setBookPage({ ...bookPage, successMessage: e.target.value })}
              />
            </AdminField>
            <StringListEditor
              label="Success next steps"
              items={bookPage.nextSteps}
              onChange={(nextSteps) => setBookPage({ ...bookPage, nextSteps })}
            />
          </div>
        </section>
      </div>

      <SaveBar onSave={handleSave} saving={saving} message={message} />
    </AdminShell>
  );
}
