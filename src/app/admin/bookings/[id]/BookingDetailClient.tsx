"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminToast } from "@/components/admin/AdminToast";
import {
  WorkspaceChrome,
} from "@/components/admin/os/WorkspaceFrame";
import { BookingCommandCenter } from "@/components/admin/booking/BookingCommandCenter";
import { adminFetch } from "@/lib/admin-fetch";
import { formatInquiryId } from "@/lib/booking";
import type { InquiryStatus } from "@/lib/types";

export function BookingDetailClient({
  submission,
}: {
  submission: {
    id: string;
    status: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
    contactEmail: string;
    data: Record<string, unknown>;
  };
}) {
  const { toast } = useAdminToast();
  const [status, setStatus] = useState(submission.status);
  const [notes, setNotes] = useState(submission.notes);
  const [data, setData] = useState(submission.data);
  const name =
    (typeof data.fullName === "string" && data.fullName) ||
    submission.contactEmail ||
    "Booking";

  async function updateStatus(next: string) {
    const res = await adminFetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: submission.id, status: next }),
    });
    if (res.ok) {
      setStatus(next);
      toast("Stage updated.");
    } else {
      toast("Could not update stage.", "error");
    }
  }

  return (
    <AdminShell title={`${name} · Command`}>
      <WorkspaceChrome
        eyebrow="Work · Bookings · Mission Control"
        title={name}
        description={`Inquiry #${formatInquiryId(submission.id)} — understand the client, run production, and deliver a white-glove experience.`}
        related={[
          { label: "Bookings inbox", href: "/admin/submissions?type=booking", desc: "All inquiries" },
          { label: "Pipeline", href: "/admin/pipeline", desc: "Stages" },
          { label: "Payments", href: "/admin/payments", desc: "Cash" },
          { label: "Email", href: "/admin/email", desc: "Send" },
        ]}
      >
        <div className="mb-4">
          <Link
            href={`/admin/submissions?type=booking&focus=${submission.id}`}
            className="text-xs tracking-[0.1em] text-fog uppercase hover:text-accent"
          >
            ← Back to bookings inbox
          </Link>
        </div>
        <BookingCommandCenter
          submissionId={submission.id}
          status={status}
          data={data}
          notes={notes}
          email={
            submission.contactEmail ||
            (typeof data.email === "string" ? data.email : undefined)
          }
          createdAt={submission.createdAt}
          onStatusChange={(s) => void updateStatus(s as InquiryStatus)}
          onNotesChange={setNotes}
          onDataRefresh={setData}
        />
      </WorkspaceChrome>
    </AdminShell>
  );
}
