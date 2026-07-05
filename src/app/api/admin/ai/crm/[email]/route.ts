import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCRMContactIntelligence } from "@/lib/ai/intelligence/crm";

export async function GET(_req: Request, { params }: { params: Promise<{ email: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await params;
  const decoded = decodeURIComponent(email);
  const intel = await getCRMContactIntelligence(decoded);
  if (!intel) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  return NextResponse.json(intel);
}
