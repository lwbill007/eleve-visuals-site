import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { refreshAndLearnBusinessKnowledge } from "@/lib/ai/memory/knowledge";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const trigger = (body as { trigger?: string }).trigger ?? "manual";

  const report = await refreshAndLearnBusinessKnowledge(
    trigger as Parameters<typeof refreshAndLearnBusinessKnowledge>[0]
  );

  return NextResponse.json({
    ok: true,
    report,
    message: `Scanned ${report.pagesScanned} pages · ${report.memoriesCreated} new memories · ${report.memoriesUpdated} updated · ${report.issuesFound.length} issues found`,
  });
}
