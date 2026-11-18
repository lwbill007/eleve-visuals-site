export type PricingFamily = "portrait" | "motion" | "partnership";
export type PricingLevel = "entry" | "signature" | "premium";

export interface ApprovedPricingPackage {
  id: string;
  family: PricingFamily;
  level: PricingLevel;
  name: string;
  price: number;
  billing: "project" | "monthly";
  description: string;
  perfectFor: string[];
  experience: string;
  included: string[];
  estimatedTimeline: string;
  exampleDeliverables: string[];
  clientExpectations: string[];
  faq: { q: string; a: string }[];
  projectCategory: string;
  galleryPreviewHint: string;
  videoPreviewHint?: string;
}

export const PRICING_VERSION = "v0.2-test-2026-11-18";
export const PRICING_STATUS = "approved_for_90_day_validation" as const;

export const PRICING_FAMILY_LABELS: Record<PricingFamily, string> = {
  portrait: "Photography",
  motion: "Video",
  partnership: "Monthly Partnerships",
};

export const MEDIA_DELIVERY_DEFINITIONS = {
  rawClip:
    "Camera-original file with no trimming, stabilization, color correction, audio cleanup, captions, music, or sequencing. Raw media is not included unless quoted in writing.",
  lightlyEditedClip:
    "One continuous 5–15 second selection, trimmed and oriented with exposure, white balance, and a basic matching look. No music-timed story, captions, graphics, or narrative revision.",
  standardReel:
    "A 15–45 second multi-shot edit for one concept, with standard color, licensed library music, a basic audio mix, simple text or captions when specified, one aspect ratio, and one consolidated revision.",
  advancedPromotionalFilm:
    "A planned 45–120 second narrative with deliberate sequencing, advanced color, sound design, interview or dialogue cleanup when scoped, titles, multiple delivery masters, and two consolidated revisions.",
} as const;

export const APPROVED_PRICING_PACKAGES: ApprovedPricingPackage[] = [
  {
    id: "photo-entry",
    family: "portrait",
    level: "entry",
    name: "Scheduled Mini",
    price: 225,
    billing: "project",
    description:
      "A focused introduction to ÉLEVÉ on a published date, at one fixed location and setup.",
    perfectFor: ["Headshot updates", "Graduation", "Artist portraits", "Couples"],
    experience:
      "A scheduled mini-session block keeps the experience accessible without cutting editing quality. Dedicated travel, custom dates, and location changes are not included.",
    included: [
      "Published date and ÉLEVÉ-selected fixed location",
      "20-minute appointment",
      "One person or one couple",
      "One look",
      "Four fully edited images selected from proofs",
      "Personal and owned-organic usage",
      "One correction request for an ÉLEVÉ processing error",
    ],
    estimatedTimeline: "5 business days",
    exampleDeliverables: ["4 edited JPEGs", "Private proof selection", "Web-ready exports"],
    clientExpectations: [
      "Choose a published mini-session block",
      "Arrive camera-ready with one look",
      "No location change or dedicated travel",
    ],
    faq: [
      {
        q: "Can I choose a custom date or location?",
        a: "Scheduled Mini is offered only on published blocks. Choose Signature for a custom session.",
      },
    ],
    projectCategory: "Portrait",
    galleryPreviewHint: "Focused portrait · one look · polished finish",
  },
  {
    id: "photo-signature",
    family: "portrait",
    level: "signature",
    name: "Signature Portrait",
    price: 450,
    billing: "project",
    description: "Creative direction and enough room to build one coherent portrait story.",
    perfectFor: ["Personal brands", "Artists", "Models", "Couples", "Founder portraits"],
    experience:
      "A guided session with a planning questionnaire, directed posing, and a cohesive final set.",
    included: [
      "Planning questionnaire",
      "60-minute session",
      "One location",
      "Up to two looks",
      "Ten fully retouched images",
      "One consolidated retouching request",
      "Personal and owned-organic usage",
    ],
    estimatedTimeline: "7–10 business days",
    exampleDeliverables: ["10 retouched images", "Web and print exports", "Private gallery"],
    clientExpectations: [
      "Share references before production",
      "Prepare up to two looks",
      "Return one consolidated correction request",
    ],
    faq: [
      {
        q: "Is Signature right for a personal brand?",
        a: "Yes when you need direction and a coherent set. Paid advertising or broader commercial use is quoted separately.",
      },
    ],
    projectCategory: "Portrait",
    galleryPreviewHint: "Directed portrait story · two looks · editorial polish",
  },
  {
    id: "photo-premium",
    family: "portrait",
    level: "premium",
    name: "Editorial Production",
    price: 1350,
    billing: "project",
    description: "A production-led portrait experience for launches and editorial narratives.",
    perfectFor: ["Editorial stories", "Artist launches", "Brand narratives", "Campaign concepts"],
    experience:
      "Pre-production, lighting direction, and a shot plan create a materially deeper experience than a longer portrait session.",
    included: [
      "Concept call, mood direction, and shot list",
      "Up to 2.5 production hours",
      "Up to two nearby locations",
      "Lighting plan",
      "24 fully retouched images",
      "Two consolidated retouching rounds",
      "Owned-organic usage for one named client",
    ],
    estimatedTimeline: "12–15 business days",
    exampleDeliverables: ["24 campaign-ready images", "Web and print exports", "Private gallery"],
    clientExpectations: [
      "Approve the concept and shot list before production",
      "Confirm location access",
      "Provide consolidated stakeholder feedback",
    ],
    faq: [
      {
        q: "What makes this Premium?",
        a: "The value is pre-production, lighting design, location planning, and a directed editorial narrative—not an inflated image count.",
      },
    ],
    projectCategory: "Portrait",
    galleryPreviewHint: "Concept-led editorial · lighting plan · location story",
  },
  {
    id: "video-entry",
    family: "motion",
    level: "entry",
    name: "Motion Entry",
    price: 450,
    billing: "project",
    description: "One focused, platform-ready idea with a tightly controlled capture and edit.",
    perfectFor: ["Artist moments", "Product details", "Social announcements", "Portrait motion"],
    experience:
      "A short capture at one location becomes one deliberately edited reel. It is not a brand film or raw clip bundle.",
    included: [
      "Client-supplied concept",
      "30-minute capture at one location",
      "One 10–15 second Standard Reel",
      "Licensed library music",
      "Standard color and audio",
      "One aspect ratio",
      "One consolidated revision",
      "Owned-organic usage",
    ],
    estimatedTimeline: "7–10 business days",
    exampleDeliverables: ["1 Standard Reel", "Platform-ready master"],
    clientExpectations: [
      "Provide one clear concept before capture",
      "Arrive production-ready",
      "Return one consolidated revision request",
    ],
    faq: [
      {
        q: "Are raw clips included?",
        a: "No. Raw camera files and clip bundles require separate written scope.",
      },
    ],
    projectCategory: "Video",
    galleryPreviewHint: "Still frames from one focused motion concept",
    videoPreviewHint: "10–15 second Standard Reel · one concept",
  },
  {
    id: "video-signature",
    family: "motion",
    level: "signature",
    name: "Motion Signature",
    price: 950,
    billing: "project",
    description: "A stronger brand or artist moment with planning and two distinct motion assets.",
    perfectFor: ["Artists", "Founders", "Personal brands", "Launch moments"],
    experience:
      "A shot plan and directed capture support one Standard Reel plus one concise supporting clip without expanding into interview or campaign production.",
    included: [
      "Planning questionnaire and shot plan",
      "60–75 minute capture at one location",
      "One 30–45 second Standard Reel",
      "One 5–10 second Lightly Edited Clip",
      "Licensed library music",
      "Standard color and audio",
      "One consolidated revision",
      "Owned-organic usage",
    ],
    estimatedTimeline: "10–12 business days",
    exampleDeliverables: ["1 Standard Reel", "1 Lightly Edited Clip"],
    clientExpectations: [
      "Approve the shot plan before capture",
      "One location and one primary concept",
      "Return one consolidated revision request",
    ],
    faq: [
      {
        q: "Does this include an interview?",
        a: "No. Interview audio, scripting, and narrative post-production move the project to Motion Production.",
      },
    ],
    projectCategory: "Video",
    galleryPreviewHint: "Directed motion stills",
    videoPreviewHint: "Standard Reel + supporting clip",
  },
  {
    id: "video-premium",
    family: "motion",
    level: "premium",
    name: "Motion Production",
    price: 3500,
    billing: "project",
    description: "A campaign or launch with a real treatment, production plan, and advanced post.",
    perfectFor: ["Campaigns", "Launch films", "Brand stories", "Interview-led work"],
    experience:
      "Pre-production, interview-capable audio, advanced color and sound, and a family of edits create a complete promotional system.",
    included: [
      "Treatment and production plan",
      "Up to five capture hours",
      "Interview-capable audio when scoped",
      "One 60–120 second Advanced Promotional Film",
      "Three Standard Reels",
      "Horizontal and vertical masters",
      "Advanced color and sound",
      "Two consolidated revision rounds",
      "Owned-organic usage",
    ],
    estimatedTimeline: "15–20 business days",
    exampleDeliverables: ["1 Advanced Promotional Film", "3 Standard Reels", "Multi-format masters"],
    clientExpectations: [
      "Approve treatment and production plan",
      "Confirm talent, products, and access before production",
      "Provide consolidated stakeholder feedback",
    ],
    faq: [
      {
        q: "What is quoted separately?",
        a: "Crew, studio, talent, travel, paid-media licensing, voice-over, original music, motion graphics, and VFX.",
      },
    ],
    projectCategory: "Video",
    galleryPreviewHint: "Campaign production stills",
    videoPreviewHint: "Advanced film + three platform reels",
  },
  {
    id: "monthly-entry",
    family: "partnership",
    level: "entry",
    name: "Monthly Essential",
    price: 650,
    billing: "monthly",
    description: "A compact monthly batch for brands with one consistent, narrow content need.",
    perfectFor: ["Solo founders", "Artists", "Local brands", "Consistent updates"],
    experience:
      "One scheduled production window creates a small repeatable batch. Publishing and social management are not included.",
    included: [
      "Monthly planning form",
      "One 45-minute production window",
      "Eight edited photos",
      "Two Lightly Edited Clips",
      "One batch correction round",
      "One primary location",
      "Owned-organic usage",
    ],
    estimatedTimeline: "10 business days per batch",
    exampleDeliverables: ["8 edited photos", "2 Lightly Edited Clips"],
    clientExpectations: [
      "Three-month initial term",
      "One scheduled production window each month",
      "No rollover of unused time or deliverables",
    ],
    faq: [
      {
        q: "Does this include posting or social management?",
        a: "No. It covers production and delivery only. Publishing, community management, analytics, and ads are separate.",
      },
    ],
    projectCategory: "Business Branding",
    galleryPreviewHint: "Compact monthly photo + motion batch",
    videoPreviewHint: "Two lightly edited monthly clips",
  },
  {
    id: "monthly-signature",
    family: "partnership",
    level: "signature",
    name: "Monthly Signature",
    price: 1350,
    billing: "monthly",
    description: "A recurring photo-and-motion system with monthly direction and one finished reel.",
    perfectFor: ["Growing brands", "Founders", "Artists", "Monthly campaigns"],
    experience:
      "A strategy check-in and longer production window create a coherent monthly asset set without agency management overhead.",
    included: [
      "Monthly strategy check-in",
      "One 90-minute production window",
      "15 edited photos",
      "Three Lightly Edited Clips",
      "One Standard Reel",
      "One batch revision",
      "One primary location",
      "Owned-organic usage",
    ],
    estimatedTimeline: "10–12 business days per batch",
    exampleDeliverables: ["15 edited photos", "3 Lightly Edited Clips", "1 Standard Reel"],
    clientExpectations: [
      "Three-month initial term",
      "Approve the monthly content direction before production",
      "No rollover of unused time or deliverables",
    ],
    faq: [
      {
        q: "Can unused deliverables roll over?",
        a: "No. Each month reserves a defined production window and delivery batch.",
      },
    ],
    projectCategory: "Business Branding",
    galleryPreviewHint: "Directed monthly content system",
    videoPreviewHint: "Standard Reel + three supporting clips",
  },
  {
    id: "monthly-premium",
    family: "partnership",
    level: "premium",
    name: "Monthly Production",
    price: 4250,
    billing: "monthly",
    description: "A capacity-limited creative production partnership for campaign-scale monthly needs.",
    perfectFor: ["Campaign teams", "Established brands", "Launch calendars", "Multi-channel content"],
    experience:
      "Deeper planning, a substantial monthly production window, and advanced post create a coordinated campaign-ready library.",
    included: [
      "Monthly content plan",
      "Up to four production hours",
      "30 edited photos",
      "Six Lightly Edited Clips",
      "Two Standard Reels",
      "One 45–60 second Advanced Promotional Film",
      "Two batch revision rounds",
      "Owned-organic usage",
    ],
    estimatedTimeline: "15 business days per batch",
    exampleDeliverables: [
      "30 edited photos",
      "6 Lightly Edited Clips",
      "2 Standard Reels",
      "1 Advanced Promotional Film",
    ],
    clientExpectations: [
      "Three-month initial term",
      "One client-side approver",
      "No rollover of unused time or deliverables",
      "Initially limited to one active client",
    ],
    faq: [
      {
        q: "What remains outside the monthly fee?",
        a: "Publishing, ads, studio, crew, talent, travel, paid-media licensing, and scope beyond the monthly production plan.",
      },
    ],
    projectCategory: "Business Branding",
    galleryPreviewHint: "Campaign-scale monthly stills",
    videoPreviewHint: "Advanced monthly film + platform reel system",
  },
];

export const SERVICE_STARTING_PRICE_TEXT: Record<string, string> = {
  photography: "Photography from $225",
  videography: "Video from $450",
  "monthly-partnerships": "Monthly partnerships from $650/month",
  "creative-direction": "Custom proposal",
};

export function pricingPackagesForFamily(family: PricingFamily): ApprovedPricingPackage[] {
  return APPROVED_PRICING_PACKAGES.filter((pkg) => pkg.family === family);
}

export function getApprovedPricingPackage(id: string): ApprovedPricingPackage | undefined {
  return APPROVED_PRICING_PACKAGES.find((pkg) => pkg.id === id);
}
