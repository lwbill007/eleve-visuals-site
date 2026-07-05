import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardOSCached } from "@/lib/admin-os-server";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(req.url).searchParams.get("refresh") === "1";
  const data = await getAdminDashboardOSCached(force);
  return NextResponse.json(data);
}
