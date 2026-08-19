import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminCRMContacts } from "@/lib/admin-os-server";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contacts = await getAdminCRMContacts();
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("Admin CRM failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Clients could not be loaded." },
      { status: 503 }
    );
  }
}
