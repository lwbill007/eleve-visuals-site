import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { adminGlobalSearch } from "@/lib/admin-os-server";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const data = await adminGlobalSearch(q);
  return NextResponse.json(data);
}
