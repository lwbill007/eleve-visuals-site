import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { analyzePortfolioImages } from "@/lib/ai/intelligence/portfolio";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { portfolioId, imageUrls } = (await req.json()) as {
    portfolioId?: string;
    imageUrls?: string[];
  };

  const result = await analyzePortfolioImages(portfolioId, imageUrls);
  return NextResponse.json(result);
}
