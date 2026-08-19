import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminPipeline } from "@/lib/admin-os-server";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pipeline = await getAdminPipeline();
    return NextResponse.json(pipeline);
  } catch (error) {
    console.error("Admin pipeline failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline could not be loaded." },
      { status: 503 }
    );
  }
}
