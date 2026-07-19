import { prisma } from "@/lib/db";
import { isAIConfigured } from "../config";
import { aiComplete } from "../adapter";
import { generateAIContent } from "../service";
import type { PortfolioAnalysisResult } from "../types";

function parseGallery(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((u): u is string => typeof u === "string");
  } catch {
    /* ignore */
  }
  return [];
}

export async function analyzePortfolioImages(
  portfolioId?: string,
  imageUrls?: string[]
): Promise<PortfolioAnalysisResult> {
  let urls = imageUrls ?? [];
  let title = "Upload batch";
  let category = "";

  if (portfolioId) {
    const item = await prisma.portfolioItem.findUnique({
      where: { id: portfolioId },
      select: { title: true, category: true, gallery: true, image: true, heroImage: true },
    });
    if (item) {
      title = item.title;
      category = item.category;
      urls = [
        ...(item.heroImage ? [item.heroImage] : []),
        ...(item.image ? [item.image] : []),
        ...parseGallery(item.gallery),
      ].filter(Boolean);
    }
  }

  const uniqueUrls = [...new Set(urls)];
  const urlHashes = new Map<string, number>();
  const duplicates: string[] = [];
  for (const url of uniqueUrls) {
    const base = url.split("?")[0];
    const count = (urlHashes.get(base) ?? 0) + 1;
    urlHashes.set(base, count);
    if (count > 1) duplicates.push(url);
  }

  const images = uniqueUrls.slice(0, 12).map((url, i) => ({
    url,
    index: i,
    suggestedHero: i === 0,
    altText: "",
    description: "",
    blurry: false,
    duplicate: duplicates.includes(url),
    category: category || "Editorial",
  }));

  if (isAIConfigured() && images.length > 0) {
    try {
      const result = await aiComplete({
        messages: [
          {
            role: "system",
            content:
              "You analyze photography portfolios. Return JSON array with objects: url, altText, description, suggestedHero (boolean), blurry (boolean guess), carouselOrder (number). ÉLEVÉ luxury cinematic tone.",
          },
          {
            role: "user",
            content: JSON.stringify({ project: title, images: images.map((img) => img.url) }),
            images: images.map((img) => img.url).slice(0, 8),
          },
        ],
        maxTokens: 2000,
        task: "portfolio_review",
        validateResponse: (content) => {
          const json = content.match(/\[[\s\S]*\]/)?.[0];
          if (!json) return false;
          const parsed = JSON.parse(json);
          return Array.isArray(parsed);
        },
      });

      const match = result?.content.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]) as {
          url: string;
          altText?: string;
          description?: string;
          suggestedHero?: boolean;
          blurry?: boolean;
          carouselOrder?: number;
        }[];
        for (const img of images) {
          const ai = parsed.find((p) => p.url === img.url || img.url.includes(p.url));
          if (ai) {
            img.altText = ai.altText || "";
            img.description = ai.description || "";
            img.suggestedHero = ai.suggestedHero ?? img.suggestedHero;
            img.blurry = ai.blurry ?? false;
          }
        }
        images.sort((a, b) => {
          const ao = parsed.find((p) => p.url === a.url)?.carouselOrder ?? a.index;
          const bo = parsed.find((p) => p.url === b.url)?.carouselOrder ?? b.index;
          return ao - bo;
        });
      }
    } catch {
      /* fallback below */
    }
  }

  if (!images.some((i) => i.altText)) {
    const batch = await generateAIContent({
      task: "alt_text",
      prompt: `Generate alt text and descriptions for ${images.length} images from "${title}" portfolio. One line per image.`,
      context: { urls: images.map((i) => i.url) },
    });
    const lines = batch.content.split("\n").filter(Boolean);
    images.forEach((img, i) => {
      if (!img.altText) img.altText = lines[i]?.replace(/^\d+\.\s*/, "") || `${title} — image ${i + 1}`;
      if (!img.description) img.description = img.altText;
    });
  }

  const hero = images.find((i) => i.suggestedHero && !i.blurry && !i.duplicate) || images[0];

  return {
    generatedAt: new Date().toISOString(),
    projectTitle: title,
    images,
    heroRecommendation: hero?.url ?? "",
    duplicates,
    blurryImages: images.filter((i) => i.blurry).map((i) => i.url),
    suggestedCategories: [...new Set([category, "Editorial", "Portrait", "Cinematic"].filter(Boolean))],
    homepagePlacement: hero ? "Feature hero on homepage if conversion rate supports this style" : "",
    instagramCarousel: images.filter((i) => !i.blurry && !i.duplicate).map((i) => i.url),
    provider: isAIConfigured() ? "openrouter" : "rules",
  };
}
