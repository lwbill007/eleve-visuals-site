import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { explainAnalytics } from "@/lib/ai/service";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const explanation = await explainAnalytics(body.data ?? body);
  return NextResponse.json({ explanation });
}
