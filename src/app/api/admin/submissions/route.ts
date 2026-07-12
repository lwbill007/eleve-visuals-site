import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  APPLICATION_STATUSES,
  coerceInquiryStatus,
  isValidInquiryStatus,
  normalizeApplicationStatus,
  type ApplicationStatus,
  type InquiryStatus,
} from "@/lib/types";
import { notifyApplicationStatusChange } from "@/lib/application-notifications";
import { maybeAutoCloseVolumeAfterAccept } from "@/lib/session-application-server";
import { parseApplicationSettings } from "@/lib/session-application";

function parseSubmissionData(raw: string) {
  try {
    const data = JSON.parse(raw);
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
    return { _raw: data };
  } catch {
    return { _parseError: true, _raw: raw };
  }
}

function isInquiryStatus(value: string): value is InquiryStatus {
  return isValidInquiryStatus(value);
}

function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

function submissionMatchesSearch(data: Record<string, unknown>, q: string): boolean {
  const haystack = [
    data.fullName,
    data.name,
    data.email,
    data.phone,
    data.instagram,
    data.subject,
    data.message,
    data.sessionVolumeTitle,
    data.projectVision,
    data.projectDetails,
    data.serviceType,
    data.location,
    data.budgetRange,
    data.referralSource,
    data.preferredDate,
    ...(Array.isArray(data.serviceTypes) ? data.serviceTypes : []),
    ...(Array.isArray(data.deliverables) ? data.deliverables : []),
    ...(Array.isArray(data.roles) ? data.roles : []),
    data.role,
  ]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const search = searchParams.get("q")?.trim().toLowerCase();
  const volumeId = searchParams.get("volumeId");

  const roleFilter = searchParams.get("role");

  let submissions = await prisma.submission.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(volumeId ? { sessionVolumeId: volumeId } : {}),
      ...(status && (isInquiryStatus(status) || isApplicationStatus(status))
        ? { status }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  if (search || roleFilter) {
    submissions = submissions.filter((s) => {
      const data = parseSubmissionData(s.data);
      if (roleFilter) {
        const record = data as Record<string, unknown>;
        const roles = Array.isArray(record.roles)
          ? (record.roles as string[])
          : typeof record.role === "string"
            ? [record.role]
            : [];
        if (!roles.some((r) => r.toLowerCase() === roleFilter.toLowerCase())) return false;
      }
      if (search && !submissionMatchesSearch(data, search)) return false;
      return true;
    });
  }

  const emails = [...new Set(submissions.map((s) => s.contactEmail).filter(Boolean))];
  const contactCounts = new Map<string, number>();
  if (emails.length > 0) {
    const grouped = await prisma.submission.groupBy({
      by: ["contactEmail"],
      where: { contactEmail: { in: emails } },
      _count: { _all: true },
    });
    for (const g of grouped) {
      contactCounts.set(g.contactEmail, g._count._all);
    }
  }

  return NextResponse.json(
    submissions.map((s) => {
      const totalFromContact = s.contactEmail ? contactCounts.get(s.contactEmail) ?? 1 : 1;
      return {
        id: s.id,
        type: s.type,
        data: parseSubmissionData(s.data),
        status: s.type === "session" ? normalizeApplicationStatus(s.status) : s.status,
        notes: s.notes,
        read: s.read,
        starred: s.starred,
        sessionVolumeId: s.sessionVolumeId,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        returningContact: totalFromContact > 1,
        contactSubmissionCount: totalFromContact,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      };
    })
  );
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, read, status, notes, starred, dataPatch, ops } = body;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
    }

    const existing = await prisma.submission.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: {
      read?: boolean;
      status?: string;
      notes?: string;
      starred?: boolean;
      readAt?: Date;
      data?: string;
    } = {};
    if (typeof read === "boolean") {
      data.read = read;
      if (read && !existing.read) data.readAt = new Date();
    }
    if (typeof notes === "string") data.notes = notes.slice(0, 10000);
    if (typeof starred === "boolean") data.starred = starred;

    if (typeof status === "string") {
      if (existing.type === "session" && isApplicationStatus(status)) {
        data.status = status;
      } else if (existing.type === "booking" && isInquiryStatus(status)) {
        data.status = coerceInquiryStatus(status);
      } else if (existing.type === "contact" && isInquiryStatus(status)) {
        data.status = coerceInquiryStatus(status);
      } else {
        return NextResponse.json({ error: "Invalid status for submission type" }, { status: 400 });
      }
    }

    // Merge ops / dataPatch into Submission.data JSON (booking command center)
    if (
      existing.type === "booking" &&
      ((ops && typeof ops === "object") || (dataPatch && typeof dataPatch === "object"))
    ) {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(existing.data) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
      if (dataPatch && typeof dataPatch === "object") {
        parsed = { ...parsed, ...(dataPatch as Record<string, unknown>) };
      }
      if (ops && typeof ops === "object") {
        const prevOps =
          parsed.ops && typeof parsed.ops === "object"
            ? (parsed.ops as Record<string, unknown>)
            : {};
        parsed.ops = { ...prevOps, ...(ops as Record<string, unknown>) };
      }
      data.data = JSON.stringify(parsed).slice(0, 500_000);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await prisma.submission.update({ where: { id }, data });

    let emailSent: boolean | null = null;
    if (typeof data.status === "string" && existing.type === "session" && isApplicationStatus(data.status)) {
      emailSent = await notifyApplicationStatusChange(id, data.status, existing.status);
      if (data.status === "accepted" && existing.sessionVolumeId) {
        const volume = await prisma.sessionVolume.findUnique({
          where: { id: existing.sessionVolumeId },
        });
        if (volume) {
          const settings = parseApplicationSettings(volume.applicationSettings);
          void maybeAutoCloseVolumeAfterAccept(existing.sessionVolumeId, settings);
        }
      }
    }

    return NextResponse.json({ ok: true, emailSent });
  } catch (error) {
    console.error("Submission PATCH failed:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
    }

    await prisma.submission.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Submission DELETE failed:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 400 });
  }
}
