import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { analyzePortfolioImages } from "@/lib/ai/intelligence/portfolio";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:portfolio-analyze");
  if (blocked) return blocked;

  const { portfolioId, imageUrls } = (await req.json()) as {
    portfolioId?: string;
    imageUrls?: string[];
  };

  const result = await analyzePortfolioImages(portfolioId, imageUrls);
  return NextResponse.json(result);
}
