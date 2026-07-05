import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  correctMemory,
  deleteMemory,
  getMemoryAudits,
  getMemoryById,
  updateMemoryFlags,
} from "@/lib/ai/memory/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const memory = await getMemoryById(id);
  if (!memory) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const audits = await getMemoryAudits(id);
  return NextResponse.json({ memory, audits });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  if (body.action === "delete") {
    await deleteMemory(id, "admin", body.reason ?? "");
    return NextResponse.json({ ok: true });
  }

  if (body.pinned !== undefined || body.archived !== undefined || body.verified !== undefined) {
    const updated = await updateMemoryFlags(
      id,
      { pinned: body.pinned, archived: body.archived, verified: body.verified },
      "admin",
      body.reason ?? ""
    );
    return NextResponse.json(updated);
  }

  if (body.title || body.summary || body.value) {
    const updated = await correctMemory(
      id,
      {
        title: body.title,
        summary: body.summary,
        value: body.value,
        confidence: body.confidence,
        importance: body.importance,
        tags: body.tags,
      },
      "admin",
      body.reason ?? "User correction"
    );
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "No valid update" }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await deleteMemory(id, "admin", "Deleted from Memory Center");
  return NextResponse.json({ ok: true });
}
