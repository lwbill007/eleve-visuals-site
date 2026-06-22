import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/lib/types";

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

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  const submissions = await prisma.submission.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(status && isInquiryStatus(status) ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(
    submissions.map((s) => ({
      id: s.id,
      type: s.type,
      data: parseSubmissionData(s.data),
      status: s.status,
      read: s.read,
      createdAt: s.createdAt.toISOString(),
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
    const { id, read, status } = body;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
    }

    const data: { read?: boolean; status?: string } = {};
    if (typeof read === "boolean") data.read = read;
    if (typeof status === "string" && isInquiryStatus(status)) data.status = status;

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
