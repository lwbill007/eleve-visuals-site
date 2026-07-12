/**
 * ÉLEVÉ Booking Experience 2.0 — premium package & add-on catalog.
 * Inquiry-first: packages educate and qualify; payment stays later.
 */

export type PackageFamily = "portrait" | "motion" | "hybrid" | "partnership";

export interface BookingPackage {
  id: string;
  family: PackageFamily;
  name: string;
  startingPrice: number;
  currency: "USD";
  headline?: string;
  description: string;
  perfectFor: string[];
  experience: string;
  included: string[];
  popular?: boolean;
  estimatedTimeline: string;
  recommendedAddOnIds: string[];
  exampleDeliverables: string[];
  faq: { q: string; a: string }[];
  clientExpectations: string[];
  /** Maps into legacy projectCategory for CRM / pipeline compatibility */
  projectCategory: string;
  galleryPreviewHint: string;
  videoPreviewHint?: string;
}

export interface BookingAddOn {
  id: string;
  name: string;
  startingPrice: number;
  description: string;
  whyItMatters: string;
  families: PackageFamily[] | "all";
}

export const PACKAGE_FAMILY_LABELS: Record<PackageFamily, string> = {
  portrait: "Portrait Experiences",
  motion: "Motion",
  hybrid: "Hybrid",
  partnership: "Creative Partnerships",
};

export const BOOKING_PACKAGES: BookingPackage[] = [
  {
    id: "foundations",
    family: "portrait",
    name: "ÉLEVÉ Foundations",
    startingPrice: 150,
    currency: "USD",
    description:
      "The perfect introduction to ÉLEVÉ. Professional, polished imagery with a simple, guided experience.",
    perfectFor: ["Graduation", "Birthdays", "Couples", "Headshots", "Lifestyle"],
    experience:
      "Designed for clients who want elevated portraits without a full production footprint. We guide posing, light, and flow so you simply show up and look like yourself—at your best.",
    included: [
      "30–45 minute session",
      "One location",
      "One outfit",
      "Professional posing guidance",
      "Professional editing",
      "Online gallery",
      "10–15 edited images",
      "7–10 day delivery",
    ],
    estimatedTimeline: "7–10 days after production",
    recommendedAddOnIds: ["rush-editing", "extra-images", "prints", "additional-outfit"],
    exampleDeliverables: ["Portrait selects", "Web-ready JPEGs", "Private gallery link"],
    faq: [
      {
        q: "Is this enough for Instagram / LinkedIn?",
        a: "Yes. Foundations is ideal for profile, graduation, and lifestyle needs. Upgrade to Signature if you want a brand system.",
      },
      {
        q: "Can I add more images later?",
        a: "Absolutely—extra images and rush editing are available as add-ons.",
      },
    ],
    clientExpectations: [
      "Arrive camera-ready with one outfit planned",
      "Allow 30–45 minutes on location",
      "Gallery delivered within 7–10 business days",
    ],
    projectCategory: "Portrait",
    galleryPreviewHint: "Clean editorial portraits · natural light · polished retouch",
  },
  {
    id: "signature",
    family: "portrait",
    name: "ÉLEVÉ Signature",
    startingPrice: 300,
    currency: "USD",
    popular: true,
    description: "Creative planning becomes part of the process. Multiple looks, directed presence.",
    perfectFor: ["Personal brands", "Influencers", "Models", "Couples", "Artists"],
    experience:
      "We build a moodboard and creative consultation into the experience so every frame advances your brand. More time, more looks, priority delivery.",
    included: [
      "Everything in Foundations",
      "Up to 90 minutes",
      "Two outfits",
      "Moodboard",
      "Creative consultation",
      "Multiple looks",
      "25–35 edited images",
      "Priority delivery",
    ],
    estimatedTimeline: "5–7 days after production",
    recommendedAddOnIds: ["rush-editing", "additional-reels", "hair-makeup", "bts-coverage"],
    exampleDeliverables: ["Brand portrait set", "Story frames", "Priority gallery"],
    faq: [
      {
        q: "Do we meet before the shoot?",
        a: "Yes—a short creative consultation and moodboard are included so production day is intentional.",
      },
    ],
    clientExpectations: [
      "Share references before consultation",
      "Prepare two outfits that match the moodboard",
      "Block 90 minutes plus travel buffer",
    ],
    projectCategory: "Portrait",
    galleryPreviewHint: "Directed personal brand · multi-look · editorial polish",
  },
  {
    id: "prestige",
    family: "portrait",
    name: "ÉLEVÉ Prestige",
    startingPrice: 500,
    currency: "USD",
    description: "Luxury editorial production with lighting design and concept planning.",
    perfectFor: ["Editorial campaigns", "Launch moments", "High-stakes personal brands"],
    experience:
      "A full creative production: multiple locations, unlimited outfits, premium retouching, BTS, and concept planning. Built for work that needs to feel cinematic and intentional.",
    included: [
      "Everything in Signature",
      "Up to 3 hours",
      "Multiple locations",
      "Unlimited outfits",
      "Premium retouching",
      "BTS content",
      "Lighting design",
      "Creative concept planning",
      "50–75 edited images",
    ],
    estimatedTimeline: "7–14 days after production",
    recommendedAddOnIds: ["second-shooter", "stylist", "lighting-package", "albums"],
    exampleDeliverables: ["Editorial gallery", "BTS reels", "Campaign-ready selects"],
    faq: [
      {
        q: "Is Prestige overkill for a personal shoot?",
        a: "Only if you want simple headshots. Prestige is for clients who want production value—light, concept, and volume.",
      },
    ],
    clientExpectations: [
      "Concept call required before production",
      "Wardrobe planned across looks",
      "Flexible on multi-location travel",
    ],
    projectCategory: "Portrait",
    galleryPreviewHint: "Luxury editorial · lighting design · multi-location",
    videoPreviewHint: "Optional BTS / social cutdowns",
  },
  {
    id: "motion",
    family: "motion",
    name: "ÉLEVÉ Motion",
    startingPrice: 250,
    currency: "USD",
    description: "Professional short-form content—planned, graded, and platform-ready.",
    perfectFor: ["Reels", "TikTok", "Product drops", "Personal brand motion"],
    experience:
      "One focused motion piece with planning, color, and licensed music. Built for vertical-first platforms without sacrificing craft.",
    included: [
      "Planning",
      "One edited reel",
      "Color grading",
      "Licensed music",
      "Vertical delivery",
    ],
    estimatedTimeline: "5–10 days after production",
    recommendedAddOnIds: ["additional-reels", "rush-editing", "assistant"],
    exampleDeliverables: ["9:16 reel", "Color-graded master", "Music-cleared export"],
    faq: [
      {
        q: "Can I get a horizontal cut?",
        a: "Yes—ask during review. Vertical is included; horizontal can be an add-on or Cinema upgrade.",
      },
    ],
    clientExpectations: ["Clear hook / CTA before shoot", "One primary location", "Quick feedback on cut"],
    projectCategory: "Video",
    galleryPreviewHint: "Still frames from motion",
    videoPreviewHint: "Vertical social reel · graded · music-cleared",
  },
  {
    id: "cinema",
    family: "motion",
    name: "ÉLEVÉ Cinema",
    startingPrice: 500,
    currency: "USD",
    popular: true,
    description: "Story-driven filmmaking with sound design and a hero film.",
    perfectFor: ["Brand stories", "Artists", "Campaign heroes", "Personal films"],
    experience:
      "A planning call, cinematic production, sound design, and color—delivered as a 1–2 minute hero film plus vertical version.",
    included: [
      "Planning call",
      "Cinematic production",
      "Sound design",
      "Color grading",
      "1–2 minute hero film",
      "Vertical version",
    ],
    estimatedTimeline: "10–21 days after production",
    recommendedAddOnIds: ["additional-reels", "second-shooter", "lighting-package"],
    exampleDeliverables: ["Hero film", "9:16 cutdown", "Sound-designed master"],
    faq: [
      {
        q: "Do you write the narrative?",
        a: "We co-author the story in the planning call. Bring the feeling; we shape the structure.",
      },
    ],
    clientExpectations: ["Planning call attendance", "Location access confirmed", "Review window of 48h"],
    projectCategory: "Video",
    galleryPreviewHint: "Cinematic stills",
    videoPreviewHint: "Hero film · sound design · vertical twin",
  },
  {
    id: "films",
    family: "motion",
    name: "ÉLEVÉ Films",
    startingPrice: 900,
    currency: "USD",
    description: "Commercial production—half-day, multi-scene, interview-capable.",
    perfectFor: ["Commercials", "Brand campaigns", "Testimonials", "Launch films"],
    experience:
      "Half-day production with multiple scenes, interviews, professional audio, and a cinematic edit with multiple deliverables.",
    included: [
      "Half-day production",
      "Multiple scenes",
      "Interviews",
      "Professional audio",
      "Cinematic edit",
      "Multiple deliverables",
    ],
    estimatedTimeline: "2–4 weeks after production",
    recommendedAddOnIds: ["second-shooter", "assistant", "lighting-package", "travel"],
    exampleDeliverables: ["Hero cut", "Interview pieces", "Social cutdowns"],
    faq: [
      {
        q: "Can this support a product launch?",
        a: "Yes. Films is built for multi-scene commercial narratives and launch assets.",
      },
    ],
    clientExpectations: ["Shot list review before call day", "Talent / product ready on set", "Multi-round feedback planned"],
    projectCategory: "Video",
    galleryPreviewHint: "Production stills",
    videoPreviewHint: "Commercial half-day · multi-deliverable",
  },
  {
    id: "fusion",
    family: "hybrid",
    name: "ÉLEVÉ Fusion",
    startingPrice: 350,
    currency: "USD",
    description: "Photography + video in one intentional production.",
    perfectFor: ["Creators", "Small brands", "Couples wanting photo + reel"],
    experience: "Directed stills and one cinematic reel with creative direction baked in.",
    included: ["20 edited photos", "One cinematic reel", "Creative direction"],
    estimatedTimeline: "7–14 days after production",
    recommendedAddOnIds: ["extra-images", "additional-reels", "rush-editing", "bts-coverage"],
    exampleDeliverables: ["Photo gallery", "Cinematic reel"],
    faq: [
      {
        q: "Is Fusion enough for a brand launch?",
        a: "For a single drop, yes. For ongoing content systems, Ascend or Apex is a better fit.",
      },
    ],
    clientExpectations: ["One primary concept", "Outfit / product ready", "Feedback within 72h"],
    projectCategory: "Hybrid",
    galleryPreviewHint: "Hybrid stills",
    videoPreviewHint: "One cinematic reel",
  },
  {
    id: "ascend",
    family: "hybrid",
    name: "ÉLEVÉ Ascend",
    startingPrice: 650,
    currency: "USD",
    popular: true,
    description: "Built for growing brands that need a content engine, not a one-off.",
    perfectFor: ["Growing brands", "Teams", "Product lines", "Recruitment"],
    experience:
      "Half-day production covering brand photography, product, team, BTS, and five reels—so you leave with a usable content library.",
    included: [
      "Half-day production",
      "Brand photography",
      "Product photography",
      "Team photos",
      "BTS",
      "Five reels",
    ],
    estimatedTimeline: "10–21 days after production",
    recommendedAddOnIds: ["stylist", "hair-makeup", "travel", "studio-rental"],
    exampleDeliverables: ["Brand gallery", "Product set", "5 reels", "BTS"],
    faq: [
      {
        q: "Can we shoot at our office?",
        a: "Yes. Ascend is designed for on-site brand days with team and product coverage.",
      },
    ],
    clientExpectations: ["Shot list aligned to marketing calendar", "Team availability blocked", "Product samples on set"],
    projectCategory: "Business Branding",
    galleryPreviewHint: "Brand + product + team",
    videoPreviewHint: "Five social reels",
  },
  {
    id: "apex",
    family: "hybrid",
    name: "ÉLEVÉ Apex",
    startingPrice: 1200,
    currency: "USD",
    description: "Flagship production—photography, video, and marketing assets at scale.",
    perfectFor: ["Flagship launches", "Website rebuilds", "Campaign seasons"],
    experience:
      "Multi-location, multi-outfit flagship day delivering 100+ photos, 10+ edited videos, and assets ready for web and marketing.",
    included: [
      "Photography",
      "Video",
      "Website content",
      "Marketing assets",
      "Multiple locations",
      "Multiple outfits",
      "100+ photos",
      "10+ edited videos",
    ],
    estimatedTimeline: "3–5 weeks after production",
    recommendedAddOnIds: ["second-shooter", "lighting-package", "stylist", "travel"],
    exampleDeliverables: ["Website hero set", "Campaign gallery", "10+ video assets"],
    faq: [
      {
        q: "How is Apex different from Reserve?",
        a: "Apex is a single flagship production. Reserve is ongoing creative access over 90 days.",
      },
    ],
    clientExpectations: ["Creative director alignment", "Multi-day planning window", "Stakeholder feedback loop"],
    projectCategory: "Business Branding",
    galleryPreviewHint: "Flagship campaign stills",
    videoPreviewHint: "10+ edited video assets",
  },
  {
    id: "reserve",
    family: "partnership",
    name: "ÉLEVÉ Reserve",
    startingPrice: 5000,
    currency: "USD",
    headline: "Your Private Creative Department.",
    description:
      "Reserve gives your brand dedicated access to ÉLEVÉ over the next 90 days. Instead of paying for individual shoots, you're investing in ongoing creative production whenever your business needs it.",
    perfectFor: ["Growing companies", "Agencies", "Founders who need on-demand creative"],
    experience:
      "12 production hours usable however you wish within 90 days—plus strategy, planning, priority scheduling, and rush editing. This is creative access, not an hourly booking.",
    included: [
      "12 production hours (flexible splits)",
      "Brand strategy",
      "Unlimited creative planning",
      "Moodboards & shot lists",
      "Photography & video",
      "Priority scheduling",
      "Rush editing",
      "Gallery",
      "Creative consulting",
      "Location scouting",
      "Wardrobe recommendations",
    ],
    estimatedTimeline: "90-day engagement",
    recommendedAddOnIds: ["travel", "studio-rental", "second-shooter"],
    exampleDeliverables: [
      "Flexible hour bank examples: 1×12h · 2×6h · 3×4h · 4×3h · 6×2h",
      "Ongoing asset pipeline",
    ],
    faq: [
      {
        q: "Do unused hours roll over?",
        a: "Hours remain active for 90 days from kickoff. Extensions can be discussed before expiry.",
      },
      {
        q: "Is this a retainer?",
        a: "It's a creative partnership with a production hour bank—not a traditional monthly retainer invoice model.",
      },
    ],
    clientExpectations: [
      "Kickoff strategy session",
      "Shared content calendar access",
      "Single point of contact on your side",
    ],
    projectCategory: "Business Branding",
    galleryPreviewHint: "Partnership portfolio samples",
    videoPreviewHint: "Ongoing motion bank",
  },
  {
    id: "legacy",
    family: "partnership",
    name: "ÉLEVÉ Legacy",
    startingPrice: 15000,
    currency: "USD",
    headline: "A Full-Year Creative Partnership.",
    description:
      "Designed for businesses that never want to worry about content again. Forty production hours across 12 months with white-glove communication and annual brand review.",
    perfectFor: ["Established brands", "Multi-location businesses", "Year-round campaign needs"],
    experience:
      "Everything in Reserve, expanded to a full year: 40 hours, quarterly strategy, campaign and launch support, concierge scheduling, and same-day previews when possible.",
    included: [
      "40 production hours over 12 months",
      "Everything in Reserve",
      "Quarterly strategy meetings",
      "Campaign planning",
      "Product launch support",
      "Website refreshes",
      "Recruitment campaigns",
      "Event coverage",
      "Executive portraits",
      "White-glove communication",
      "Concierge scheduling",
      "Same-day previews (when possible)",
      "Annual brand review",
    ],
    estimatedTimeline: "12-month partnership",
    recommendedAddOnIds: ["travel", "studio-rental", "second-shooter", "lighting-package"],
    exampleDeliverables: [
      "Flexible splits: 5×8h · 10×4h · 20×2h",
      "Quarterly campaign packs",
      "Annual brand review deck",
    ],
    faq: [
      {
        q: "Who is Legacy for?",
        a: "Brands that treat creative as infrastructure—not a one-off vendor project.",
      },
    ],
    clientExpectations: [
      "Executive sponsor identified",
      "Quarterly planning attendance",
      "Shared brand guidelines",
    ],
    projectCategory: "Business Branding",
    galleryPreviewHint: "Year-long brand system",
    videoPreviewHint: "Campaign + recruitment + event coverage",
  },
];

export const BOOKING_ADDONS: BookingAddOn[] = [
  {
    id: "rush-editing",
    name: "Rush Editing",
    startingPrice: 75,
    description: "Accelerated turnaround on your gallery or film.",
    whyItMatters: "Protects launch dates and keeps momentum when timing is non-negotiable.",
    families: "all",
  },
  {
    id: "extra-images",
    name: "Extra Images",
    startingPrice: 50,
    description: "Additional edited stills beyond your package count.",
    whyItMatters: "Gives your team more options for campaigns, press, and seasonal refreshes.",
    families: ["portrait", "hybrid", "partnership"],
  },
  {
    id: "additional-reels",
    name: "Additional Reels",
    startingPrice: 125,
    description: "Extra vertical edits from the same production.",
    whyItMatters: "Multiplies content without another shoot day.",
    families: ["motion", "hybrid", "partnership"],
  },
  {
    id: "assistant",
    name: "Assistant",
    startingPrice: 150,
    description: "On-set support for grip, talent flow, and efficiency.",
    whyItMatters: "Keeps production moving so creative time stays on the frame.",
    families: ["motion", "hybrid", "partnership"],
  },
  {
    id: "second-shooter",
    name: "Second Shooter",
    startingPrice: 250,
    description: "Second camera for coverage density and alternate angles.",
    whyItMatters: "Essential for events, interviews, and multi-subject productions.",
    families: ["motion", "hybrid", "partnership", "portrait"],
  },
  {
    id: "lighting-package",
    name: "Lighting Package",
    startingPrice: 175,
    description: "Expanded lighting design beyond natural / ambient setups.",
    whyItMatters: "Creates editorial control indoors and after golden hour.",
    families: "all",
  },
  {
    id: "hair-makeup",
    name: "Hair & Makeup Coordination",
    startingPrice: 200,
    description: "We coordinate professional HMU for the production.",
    whyItMatters: "On-camera polish that photographs and films consistently.",
    families: ["portrait", "hybrid", "partnership"],
  },
  {
    id: "stylist",
    name: "Stylist Coordination",
    startingPrice: 250,
    description: "Wardrobe / prop styling coordination for the concept.",
    whyItMatters: "Elevates look cohesion across outfits and brand assets.",
    families: ["portrait", "hybrid", "partnership"],
  },
  {
    id: "bts-coverage",
    name: "BTS Coverage",
    startingPrice: 150,
    description: "Behind-the-scenes stills and/or short clips.",
    whyItMatters: "Authenticity content that feeds social while the hero work cooks.",
    families: "all",
  },
  {
    id: "prints",
    name: "Prints",
    startingPrice: 40,
    description: "Archival prints of selected images.",
    whyItMatters: "Turns digital selects into lasting objects.",
    families: ["portrait", "hybrid", "partnership"],
  },
  {
    id: "albums",
    name: "Albums",
    startingPrice: 350,
    description: "Designed photo album of your production.",
    whyItMatters: "A heirloom presentation for couples, milestones, and VIP clients.",
    families: ["portrait", "hybrid", "partnership"],
  },
  {
    id: "canvas",
    name: "Canvas Prints",
    startingPrice: 120,
    description: "Large-format canvas of signature frames.",
    whyItMatters: "Statement pieces for home, studio, or office walls.",
    families: ["portrait", "hybrid", "partnership"],
  },
  {
    id: "travel",
    name: "Travel",
    startingPrice: 100,
    description: "Travel beyond our standard local radius.",
    whyItMatters: "Unlocks the right location without compromising production quality.",
    families: "all",
  },
  {
    id: "studio-rental",
    name: "Studio Rental",
    startingPrice: 150,
    description: "Controlled studio environment for the session.",
    whyItMatters: "Weather-proof, light-controlled space for premium consistency.",
    families: "all",
  },
  {
    id: "additional-outfit",
    name: "Additional Outfit",
    startingPrice: 50,
    description: "Extra wardrobe change beyond package allotment.",
    whyItMatters: "More looks = more usable variety from a single day.",
    families: ["portrait", "hybrid"],
  },
];

export function getPackageById(id: string): BookingPackage | undefined {
  return BOOKING_PACKAGES.find((p) => p.id === id);
}

export function getAddOnById(id: string): BookingAddOn | undefined {
  return BOOKING_ADDONS.find((a) => a.id === id);
}

export function packagesForFamily(family: PackageFamily): BookingPackage[] {
  return BOOKING_PACKAGES.filter((p) => p.family === family);
}

export function addOnsForPackage(pkg: BookingPackage): BookingAddOn[] {
  return BOOKING_ADDONS.filter(
    (a) => a.families === "all" || a.families.includes(pkg.family)
  );
}

export function formatPackagePrice(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function estimateInquiryValue(packageId: string, addOnIds: string[]): number {
  const pkg = getPackageById(packageId);
  if (!pkg) return 0;
  const addOnTotal = addOnIds.reduce((sum, id) => {
    const a = getAddOnById(id);
    return sum + (a?.startingPrice ?? 0);
  }, 0);
  return pkg.startingPrice + addOnTotal;
}

/** Map package → budget range label compatible with legacy CMS enums. */
export function budgetRangeFromPackage(packageId: string, addOnIds: string[] = []): string {
  const value = estimateInquiryValue(packageId, addOnIds);
  if (value >= 5000) return "$1,000+";
  if (value >= 1000) return "$1,000+";
  if (value >= 500) return "$500–1,000";
  if (value >= 300) return "$300–500";
  if (value >= 150) return "$150–300";
  return "Under $150";
}

export function deliverablesFromPackage(pkg: BookingPackage): string[] {
  const out: string[] = [];
  const blob = [...pkg.included, ...pkg.exampleDeliverables].join(" ").toLowerCase();
  if (/photo|image|portrait|gallery/.test(blob)) out.push("Edited Photography");
  if (/video|reel|film|motion|cinema/.test(blob)) out.push("Cinematic Video");
  if (/reel|vertical|social/.test(blob)) out.push("Vertical Social Reels");
  if (/bts|behind/.test(blob)) out.push("Behind-the-Scenes Content");
  if (/direction|concept|planning|moodboard/.test(blob)) out.push("Creative Direction");
  if (/color|grading|retouch/.test(blob)) out.push("Color Grading");
  if (/brand|campaign|marketing|website/.test(blob)) out.push("Visual Campaign Assets");
  return out.length > 0 ? out : ["Edited Photography"];
}
