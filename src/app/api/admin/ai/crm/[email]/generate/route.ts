import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateCRMContactAI } from "@/lib/ai/intelligence/crm";

export async function POST(req: Request, { params }: { params: Promise<{ email: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await params;
  const { type } = (await req.json()) as { type?: "summary" | "email" | "upsell" };
  const content = await generateCRMContactAI(decodeURIComponent(email), type || "summary");
  return NextResponse.json({ content });
}
