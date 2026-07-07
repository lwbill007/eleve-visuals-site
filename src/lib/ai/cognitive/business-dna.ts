import { getBrandInstitutionalMemory } from "../marketing/brand-memory";
import {
  EXECUTIVE_OUTCOMES,
  NORTH_STAR_METRICS,
  OPERATING_PRINCIPLES,
} from "../executive/charter";
import { getMemory, writeMemory } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import type { BusinessDNA } from "./types";

const DNA_KEY = "cognitive_dna";

export async function buildBusinessDNA(): Promise<BusinessDNA> {
  const brand = await getBrandInstitutionalMemory();

  const dna: BusinessDNA = {
    generatedAt: new Date().toISOString(),
    confidence: 0.92,
    mission:
      "Elevate every client through cinematic, editorial photography that builds personal brand equity and lasting creative legacy.",
    vision:
      "Become the definitive luxury visual studio for professionals, creatives, and brands who refuse ordinary imagery.",
    coreValues: [
      "Cinematic excellence over volume",
      "Client transformation over transactions",
      "Editorial integrity over trends",
      "Transparency in creative process",
      "Long-term relationships over one-off shoots",
    ],
    luxuryPositioning:
      "Boutique editorial studio — not a volume headshot shop. Premium pricing reflects premium experience, direction, and deliverables.",
    brandPersonality: brand?.identity.voice ?? "Refined, confident, minimalist, cinematic",
    toneOfVoice:
      "Speak like trusted creative directors — warm authority, never salesy. Black, white, subtle gold. No cheesy marketing language.",
    idealClients: brand?.idealClients ?? [
      "Professionals building personal brand",
      "Models and creatives for ÉLEVÉ Sessions",
      "Brands seeking cinematic storytelling",
    ],
    targetMarkets: [
      brand?.identity.description ? "Primary market from site positioning" : "Regional luxury portrait market",
      "ÉLEVÉ Sessions editorial casting community",
      "Brand and commercial visual storytelling",
    ],
    competitiveAdvantages: brand?.competitiveAdvantages ?? [
      "Cinematic editorial quality",
      "ÉLEVÉ Sessions unique IP",
      "End-to-end premium experience",
    ],
    services:
      brand?.services.map((s) => ({
        title: s.title,
        price: s.price,
        philosophy: s.tagline,
      })) ?? [],
    pricingPhilosophy:
      "Value-based premium pricing — never race to the bottom. Higher APV through positioning, upsells, and repeat clients.",
    creativeDirection: "Editorial noir, cinematic lighting, intentional negative space, story-first composition",
    photographyStyle: brand?.identity.visualStyle ?? "Cinematic noir lighting, editorial composition, luxury portrait aesthetic",
    editingStyle: "Film-grade color grading, restrained retouching, consistent ÉLEVÉ signature look",
    businessGoals: brand?.businessGoals ?? EXECUTIVE_OUTCOMES.map(String),
    growthStrategy:
      "Portfolio-led inbound → Sessions community → CRM nurture → repeat bookings → referrals. Compound brand equity.",
    northStarMetrics: NORTH_STAR_METRICS.map((m) =>
      m.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
    ),
    companyCulture: "Small elite team, high craft standards, client-first operations, continuous creative evolution",
    decisionPrinciples: OPERATING_PRINCIPLES.map(String),
    businessRules: [
      "Every recommendation must reference Business DNA before suggesting actions",
      "Never optimize vanity metrics — optimize qualified inquiries, bookings, APV, LTV",
      "Never fabricate data — label Verified vs Estimated vs Predicted",
      "Archive obsolete knowledge; strengthen verified knowledge",
      "Protect client privacy in all AI outputs",
    ],
    brandStandards: [
      "Hero imagery must match cinematic noir positioning",
      "Copy must pass luxury tone review",
      "Portfolio curation over quantity",
      "Consistent CTA paths to /book",
    ],
    competitivePosition:
      "Premium editorial alternative to commodity photography — competing on artistry, experience, and outcomes",
  };

  await writeMemory({
    workspaceId: getWorkspaceId(),
    layer: "business",
    category: "business_dna",
    key: DNA_KEY,
    title: "ÉLEVÉ Business DNA",
    summary: "Permanent cognitive foundation — mission, positioning, rules, north star",
    value: dna as unknown as Record<string, unknown>,
    confidence: dna.confidence,
    importance: 100,
    source: "system",
    sourceRef: "cognitive:business-dna",
    pinned: true,
    verified: true,
    tags: ["dna", "cognitive", "pinned-context", "executive"],
    actor: "cognitive-architecture",
    reason: "Business DNA — never archive",
  }).catch(() => {});

  return dna;
}

export async function getBusinessDNA(): Promise<BusinessDNA> {
  const mem = await getMemory("business", "business_dna", DNA_KEY, getWorkspaceId());
  if (mem?.value && typeof mem.value === "object" && "mission" in mem.value) {
    return mem.value as unknown as BusinessDNA;
  }
  return buildBusinessDNA();
}

export function formatBusinessDNAForPrompt(dna: BusinessDNA): string {
  return [
    "BUSINESS DNA (reference before every recommendation):",
    `Mission: ${dna.mission}`,
    `Vision: ${dna.vision}`,
    `Positioning: ${dna.luxuryPositioning}`,
    `Tone: ${dna.toneOfVoice}`,
    `Ideal clients: ${dna.idealClients.slice(0, 4).join("; ")}`,
    `Pricing philosophy: ${dna.pricingPhilosophy}`,
    `Creative direction: ${dna.creativeDirection}`,
    `Growth strategy: ${dna.growthStrategy}`,
    `Decision principles: ${dna.decisionPrinciples.slice(0, 3).join(" · ")}`,
    `North star: ${dna.northStarMetrics.slice(0, 5).join(", ")}`,
  ].join("\n");
}
