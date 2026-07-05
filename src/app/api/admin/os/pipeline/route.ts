import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminPipeline } from "@/lib/admin-os-server";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pipeline = await getAdminPipeline();
  return NextResponse.json(pipeline);
}
