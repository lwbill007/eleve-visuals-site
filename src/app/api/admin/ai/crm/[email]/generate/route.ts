import { NextResponse } from "next/server";
import { requireAdmin, requireMinimumRole } from "@/lib/auth";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";
import { generateCRMContactAI } from "@/lib/ai/intelligence/crm";

export async function POST(req: Request, { params }: { params: Promise<{ email: string }> }) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:crm-generate");
  if (blocked) return blocked;

  const { email } = await params;
  const { type } = (await req.json()) as { type?: "summary" | "email" | "upsell" };
  const { content, reason } = await generateCRMContactAI(decodeURIComponent(email), type || "summary");
  return NextResponse.json({ content, reason });
}
