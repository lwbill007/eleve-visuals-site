"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminToast } from "@/components/admin/AdminToast";
import { OsCapabilityGrid, type OsCapability } from "@/components/admin/os/OsCapabilityGrid";
import { WorkspaceChrome } from "@/components/admin/os/WorkspaceFrame";
import { BookingCommandCenter } from "@/components/admin/booking/BookingCommandCenter";
import { adminFetch } from "@/lib/admin-fetch";
import { formatInquiryId } from "@/lib/booking";
import { buildHealth } from "@/lib/booking-command";
import { METRIC_OWNERS, type MissingMetric } from "@/lib/ai/platform/metric-owners";
import { osEyebrow, osPage } from "@/lib/ai/platform/os-systems";
import type { InquiryStatus } from "@/lib/types";

const page = osPage("bookings")!;

function capMissing(
  label: string,
  reason: string,
  required: string[],
  unlockAfter: string,
  owner = METRIC_OWNERS.bookings
): MissingMetric {
  return {
    label,
    reason,
    required,
    confidence: 0,
    unlockAfter,
    owner,
    unlockHref: owner.id === "financial_center" ? "/admin/financial" : "/admin/qa",
  };
}

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

  const health = useMemo(() => buildHealth(data), [data]);
  const healthByKey = useMemo(() => {
    const m = new Map(health.map((h) => [h.key, h]));
    return m;
  }, [health]);

  const hasTimeline =
    healthByKey.get("timeline")?.status === "ready" || Boolean(data.preferredDate);
  const hasQuestionnaire = healthByKey.get("questionnaire")?.status === "ready";
  const hasContractTerms = healthByKey.get("contract")?.status !== "missing";
  const deliverablesLive =
    (Array.isArray(data.deliverables) && data.deliverables.length > 0) ||
    typeof data.packageId === "string";
  const hasComms = Boolean(
    submission.contactEmail ||
      (typeof data.email === "string" && data.email) ||
      (typeof data.phone === "string" && data.phone)
  );
  const hasFiles = Boolean(
    data.driveLink || data.moodBoardUrl || data.pinterestLink || data.inspirationInstagram
  );

  const capabilities: OsCapability[] = [
    {
      id: "timeline",
      label: "Timeline",
      status: hasTimeline ? "live" : "partial",
      summary: hasTimeline
        ? "Preferred date / journey timeline available."
        : "Stage timeline exists; shoot date preference missing.",
    },
    {
      id: "contract",
      label: "Contract",
      status: hasContractTerms ? "partial" : "planned",
      summary: hasContractTerms
        ? "Terms accepted at inquiry — formal contract not generated."
        : "No contract on file.",
      missing: hasContractTerms
        ? undefined
        : capMissing(
            "Contract",
            "No contract object for this booking.",
            ["Contract generation", "Signature status"],
            "Unlock after contract workflow ships."
          ),
    },
    {
      id: "invoice",
      label: "Invoice",
      status: "planned",
      summary: "Invoices owned by Financial Center — not generated per booking yet.",
      missing: capMissing(
        "Invoice",
        "No Invoice linked to this booking.",
        ["Invoice entity", "Booking linkage"],
        "Unlock after Financial Center invoices.",
        METRIC_OWNERS.financial_center
      ),
    },
    {
      id: "questionnaire",
      label: "Questionnaire",
      status: hasQuestionnaire ? "live" : "partial",
      summary: hasQuestionnaire
        ? "Discovery / vision answers captured."
        : "Questionnaire incomplete.",
    },
    {
      id: "shot_list",
      label: "Shot List",
      status: "planned",
      summary: "Shot lists live under Create / Sessions — not on this booking yet.",
      missing: capMissing(
        "Shot List",
        "No shot list attached to this booking.",
        ["Shot list entity", "Link to booking or session"],
        "Unlock after Create Sessions shot lists."
      ),
    },
    {
      id: "deliverables",
      label: "Deliverables",
      status: deliverablesLive ? "partial" : "planned",
      summary: deliverablesLive
        ? "Package / deliverable hints from inquiry — fulfillment not tracked."
        : "No deliverables specified.",
      missing: deliverablesLive
        ? undefined
        : capMissing(
            "Deliverables",
            "No package or deliverable list on this booking.",
            ["Package selection", "Delivery checklist"],
            "Unlock after package + delivery tracking."
          ),
    },
    {
      id: "gallery",
      label: "Gallery",
      status: "planned",
      summary: "Client gallery portal is not connected.",
      missing: capMissing(
        "Gallery",
        "Gallery portal not enabled for this booking.",
        ["Gallery host", "Access codes", "Delivery event"],
        "Unlock after gallery portal ships."
      ),
    },
    {
      id: "payments",
      label: "Payments",
      status: "partial",
      summary: "Record and verify cash in Financial Center — no silent auto-charge here.",
      href: "/admin/financial",
    },
    {
      id: "communication",
      label: "Communication",
      status: hasComms ? "partial" : "planned",
      summary: hasComms
        ? "Contact channels on file — unified thread history not stored here."
        : "No contact channels on this booking.",
      href: hasComms ? "/admin/email" : undefined,
      missing: hasComms
        ? undefined
        : capMissing(
            "Communication",
            "No email/phone on this booking.",
            ["Client email or phone"],
            "Unlock after contact details exist."
          ),
    },
    {
      id: "files",
      label: "Files",
      status: hasFiles ? "partial" : "planned",
      summary: hasFiles
        ? "External links (drive / mood / refs) — DAM not attached."
        : "No files linked yet.",
      href: hasFiles ? "/admin/media" : undefined,
      missing: hasFiles
        ? undefined
        : capMissing(
            "Files",
            "No drive, mood board, or reference links.",
            ["Client asset links", "Media library attachment"],
            "Unlock after assets are attached."
          ),
    },
  ];

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
    <AdminShell title={`${name} · Booking`}>
      <WorkspaceChrome
        eyebrow={osEyebrow("work", page.question)}
        title={name}
        description={`Inquiry #${formatInquiryId(submission.id)} — ${page.purpose}`}
        related={[
          { label: "Bookings", href: "/admin/submissions?type=booking", desc: "All inquiries" },
          { label: "Pipeline", href: "/admin/pipeline", desc: "Stages" },
          { label: "Financial", href: "/admin/financial", desc: "Cash" },
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

        <OsCapabilityGrid
          className="mb-8"
          title="What this booking needs"
          subtitle="Live vs MissingMetric — never invent readiness."
          capabilities={capabilities}
        />

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
