import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminInsights } from "@/lib/admin-os-server";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getAdminInsights();
  return NextResponse.json(data);
}
