import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  APPLICATION_STATUSES,
  INQUIRY_STATUSES,
  normalizeApplicationStatus,
  type ApplicationStatus,
  type InquiryStatus,
} from "@/lib/types";

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
  return (INQUIRY_STATUSES as readonly string[]).includes(value);
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

  return NextResponse.json(
    submissions.map((s) => ({
      id: s.id,
      type: s.type,
      data: parseSubmissionData(s.data),
      status: s.type === "session" ? normalizeApplicationStatus(s.status) : s.status,
      notes: s.notes,
      read: s.read,
      starred: s.starred,
      sessionVolumeId: s.sessionVolumeId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }))
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
    const { id, read, status, notes, starred } = body;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
    }

    const existing = await prisma.submission.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: { read?: boolean; status?: string; notes?: string; starred?: boolean } = {};
    if (typeof read === "boolean") data.read = read;
    if (typeof notes === "string") data.notes = notes.slice(0, 10000);
    if (typeof starred === "boolean") data.starred = starred;

    if (typeof status === "string") {
      if (existing.type === "session" && isApplicationStatus(status)) {
        data.status = status;
      } else if (existing.type === "booking" && isInquiryStatus(status)) {
        data.status = status;
      } else if (existing.type === "contact" && isInquiryStatus(status)) {
        data.status = status;
      } else {
        return NextResponse.json({ error: "Invalid status for submission type" }, { status: 400 });
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await prisma.submission.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
