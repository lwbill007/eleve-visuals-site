import { NextResponse } from "next/server";
import { ADMIN_ROLES, getSession, requireAdmin } from "@/lib/auth";

/** Current session + role ladder (multi-user foundation). */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await getSession();
  return NextResponse.json({
    session,
    roles: ADMIN_ROLES,
    note: "Single-password login maps to owner. Multi-user invites ship when User table is added — role checks are live on sensitive APIs.",
  });
}
