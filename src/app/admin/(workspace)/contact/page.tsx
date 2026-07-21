"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminField, AdminInput, AdminTextarea, SaveBar } from "@/components/admin/AdminForm";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { useAdminToast } from "@/components/admin/AdminToast";
import { adminFetch } from "@/lib/admin-fetch";
import { saveAdminContent } from "@/lib/admin-save";
import { DEFAULT_CONTACT_PAGE } from "@/lib/defaults";
import { useAdminEditor } from "@/hooks/useAdminEditor";
import type { ContactPageContent } from "@/lib/types";

export default function AdminContactPage() {
  const { toast } = useAdminToast();
  const [contact, setContact] = useState<ContactPageContent>(DEFAULT_CONTACT_PAGE);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const editor = useAdminEditor(
    contact,
    (next) => saveAdminContent("contactPage", next),
    { autosave: true }
  );
  const resetEditor = editor.reset;

  useEffect(() => {
    adminFetch("/api/admin/content")
      .then((r) => r.json())
      .then((items: { key: string; value: unknown }[]) => {
        const item = items.find((c) => c.key === "contactPage");
        if (item?.value) {
          const merged = { ...DEFAULT_CONTACT_PAGE, ...(item.value as ContactPageContent) };
          setContact(merged);
          resetEditor(merged);
        }
      })
      .finally(() => setLoading(false));
  }, [resetEditor]);

  async function persist() {
    const ok = await editor.save();
    if (ok) toast("Contact page saved.");
    setMessage(ok ? "Saved." : "Save failed.");
    return ok;
  }

  if (loading) {
    return (
      <AdminShell title="Contact Page">
        <AdminPageSkeleton />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Contact Page">
      <p className="mb-6 text-sm text-fog">
        Email, phone, and business hours are managed in{" "}
        <Link href="/admin/settings" className="text-accent hover:underline">
          Site Settings
        </Link>
        . Contact form submissions appear in{" "}
        <Link href="/admin/submissions?type=contact" className="text-accent hover:underline">
          Contact Messages
        </Link>
        .
      </p>

      <div className="space-y-4">
        <AdminField label="Page headline">
          <AdminInput value={contact.headline} onChange={(e) => setContact({ ...contact, headline: e.target.value })} />
        </AdminField>
        <AdminField label="Subheadline">
          <AdminTextarea value={contact.subheadline} onChange={(e) => setContact({ ...contact, subheadline: e.target.value })} />
        </AdminField>
        <AdminField label="Form note" hint="Shown above or near the contact form">
          <AdminTextarea value={contact.formNote} onChange={(e) => setContact({ ...contact, formNote: e.target.value })} />
        </AdminField>
        <AdminField label="Booking CTA link" hint="e.g. /book">
          <AdminInput value={contact.bookingLink} onChange={(e) => setContact({ ...contact, bookingLink: e.target.value })} />
        </AdminField>
        <AdminField label="Calendar URL (Calendly, etc.)" hint="Leave empty to hide">
          <AdminInput
            value={contact.calendarUrl || ""}
            onChange={(e) => setContact({ ...contact, calendarUrl: e.target.value || null })}
          />
        </AdminField>
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
