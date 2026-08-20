import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireMinimumRole } from "@/lib/auth";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";
import {
  correctMemory,
  deleteMemory,
  getMemoryAudits,
  getMemoryById,
  updateMemoryFlags,
} from "@/lib/ai/memory/store";

const patchSchema = z.object({
  action: z.literal("delete").optional(),
  reason: z.string().max(2000).optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  verified: z.boolean().optional(),
  title: z.string().max(500).optional(),
  summary: z.string().max(5000).optional(),
  value: z.record(z.string(), z.unknown()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  importance: z.number().min(0).max(1).optional(),
  tags: z.array(z.string().max(100)).max(50).optional(),
});

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
    await requireMinimumRole("operator");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:memory-write");
  if (blocked) return blocked;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const body = parsed.data;

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

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireMinimumRole("operator");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:memory-write");
  if (blocked) return blocked;

  const { id } = await params;
  await deleteMemory(id, "admin", "Deleted from Memory Center");
  return NextResponse.json({ ok: true });
}
