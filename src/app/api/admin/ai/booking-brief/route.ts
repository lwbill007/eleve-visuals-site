import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { searchMemories } from "@/lib/ai/memory/store";
import { getWorkspaceId } from "@/lib/ai/memory/workspace";
import { prisma } from "@/lib/db";
import { persistBookingProductionIntel } from "@/lib/ai/intelligence/booking-production-brief";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const workspaceId = getWorkspaceId();
  const [briefs, proposals] = await Promise.all([
    searchMemories({ workspaceId, category: "booking_brief", limit: 50 }),
    searchMemories({ workspaceId, category: "booking_proposal", limit: 50 }),
  ]);

  const brief = briefs.items.find((m) => m.sourceRef === id || m.key === `brief-${id}`);
  const proposal = proposals.items.find(
    (m) => m.sourceRef === id || m.key === `proposal-${id}`
  );

  return NextResponse.json({
    brief: brief
      ? { id: brief.id, title: brief.title, summary: brief.summary, value: brief.value, verified: brief.verified }
      : null,
    proposal: proposal
      ? {
          id: proposal.id,
          title: proposal.title,
          summary: proposal.summary,
          value: proposal.value,
          verified: proposal.verified,
        }
      : null,
  });
}

/** Regenerate brief + proposal draft for a submission (admin). */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const submission = await prisma.submission.findUnique({ where: { id: body.id } });
  if (!submission || submission.type !== "booking") {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(submission.data) as Record<string, unknown>;
  } catch {
    /* ignore */
  }

  const intel = await persistBookingProductionIntel(submission.id, {
    fullName: typeof data.fullName === "string" ? data.fullName : undefined,
    email: typeof data.email === "string" ? data.email : submission.contactEmail,
    projectCategory: typeof data.projectCategory === "string" ? data.projectCategory : undefined,
    serviceTypes: Array.isArray(data.serviceTypes) ? (data.serviceTypes as string[]) : undefined,
    purpose: typeof data.purpose === "string" ? data.purpose : undefined,
    goals: typeof data.goals === "string" ? data.goals : undefined,
    audience: typeof data.audience === "string" ? data.audience : undefined,
    creativeDirection:
      typeof data.creativeDirection === "string" ? data.creativeDirection : undefined,
    projectVision: typeof data.projectVision === "string" ? data.projectVision : undefined,
    preferredDate: typeof data.preferredDate === "string" ? data.preferredDate : undefined,
    location: typeof data.location === "string" ? data.location : undefined,
    sessionSetting: typeof data.sessionSetting === "string" ? data.sessionSetting : undefined,
    duration: typeof data.duration === "string" ? data.duration : undefined,
    budgetRange: typeof data.budgetRange === "string" ? data.budgetRange : undefined,
    projectTimeline: typeof data.projectTimeline === "string" ? data.projectTimeline : undefined,
    deliverables: Array.isArray(data.deliverables) ? (data.deliverables as string[]) : undefined,
    referralSource: typeof data.referralSource === "string" ? data.referralSource : undefined,
  });

  return NextResponse.json({ ok: true, intel });
}
