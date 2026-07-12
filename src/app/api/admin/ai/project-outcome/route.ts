import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { recordProjectOutcome } from "@/lib/ai/learning/project-feedback";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body?.submissionId || typeof body.booked !== "boolean") {
    return NextResponse.json(
      { error: "submissionId and booked are required" },
      { status: 400 }
    );
  }

  const result = await recordProjectOutcome({
    submissionId: String(body.submissionId),
    clientEmail: typeof body.clientEmail === "string" ? body.clientEmail : undefined,
    booked: Boolean(body.booked),
    finalRevenue: typeof body.finalRevenue === "number" ? body.finalRevenue : undefined,
    profit: typeof body.profit === "number" ? body.profit : undefined,
    clientRating: typeof body.clientRating === "number" ? body.clientRating : undefined,
    deliveryDays: typeof body.deliveryDays === "number" ? body.deliveryDays : undefined,
    portfolioFeatured: Boolean(body.portfolioFeatured),
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });

  return NextResponse.json(result);
}
