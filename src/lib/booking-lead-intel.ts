/**
 * Lead intelligence + creative brief presentation layer.
 * Derives agency-grade copy from Submission data without duplicating hero metrics.
 */

import {
  estimateInquiryValue,
  getAddOnById,
  getPackageById,
  type BookingPackage,
} from "./booking-packages";
import { opportunityGrade, type OpportunityGrade } from "./booking-command";
import type { InquiryQualification, LeadPriority } from "./booking-qualification";

export type RiskLevel = "Low" | "Medium" | "High";

export interface StructuredRisk {
  category: "Scheduling" | "Weather" | "Budget" | "Creative" | "Timeline" | "Approvals";
  level: RiskLevel;
  note: string;
  recommendation: string;
}

export interface StructuredUpsell {
  name: string;
  priority: "High" | "Medium" | "Low";
  reason: string;
  impact: string;
  estimatedValue: number;
}

export interface CreativeRecommendations {
  photographyStyle: string;
  videoStyle: string;
  colorPalette: string;
  lightingStyle: string;
  lensSuggestions: string;
  cameraMovement: string;
  editingStyle: string;
  musicDirection: string;
  wardrobeSuggestions: string;
  locationIdeas: string;
  productionComplexity: string;
}

export interface SalesStrategyView {
  recommendedNextStep: string;
  meetingType: string;
  estimatedLength: string;
  salesStrategy: string;
  confidenceLevel: number;
  businessOpportunitySummary: string;
}

export interface LeadIntelView {
  executiveSummary: string;
  scoreReasons: string[];
  recommendedAction: {
    primary: string;
    primaryGoal: string;
    secondaryGoal: string;
  };
  salesStrategy: SalesStrategyView;
  suggestedQuestions: string[];
  missingAssets: { label: string; missing: boolean; action?: string }[];
  brief: {
    projectVision: string;
    desiredEmotion: string;
    primaryGoal: string;
    targetAudience: string;
    story: string;
    creativeInspiration: string;
    successDefinition: string;
    creativeDirection: string;
  };
  creative: CreativeRecommendations;
  salesSummary: string;
  risks: StructuredRisk[];
  upsells: StructuredUpsell[];
  proposal: {
    status: string;
    investmentEstimate: string;
    approvalStatus: string;
    discoveryRequirement: string;
    nextStep: string;
  };
  bookingIntelligence: {
    opportunityGrade: OpportunityGrade;
    portfolioImpact: string;
    partnershipPotential: string;
    longTermValue: string;
    estimatedLifetimeValue: number;
    profitMargin: string;
    creativeComplexity: string;
    schedulingDifficulty: string;
    brandAlignment: string;
  };
  advisor: string[];
  confidence: number;
  metrics: {
    estimatedProjectValue: number;
    leadScore: number;
    likelihoodToClose: number;
    priority: LeadPriority;
  };
}

function str(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return typeof v === "string" ? v.trim() : "";
}

function uniqSentences(parts: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const t = p.replace(/\s+/g, " ").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.join(" ");
}

function oneSentence(text: string, fallback: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return fallback;
  const cut = t.split(/(?<=[.!?])\s+/)[0] || t;
  return cut.length > 180 ? `${cut.slice(0, 177)}…` : cut;
}

function paragraph(text: string, fallback: string, max = 320): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return fallback;
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function buildLeadIntel(data: Record<string, unknown>): LeadIntelView {
  const q = (data.qualification as Partial<InquiryQualification> | undefined) || {};
  const pkg = getPackageById(typeof data.packageId === "string" ? data.packageId : q.packageId || "");
  const addOnIds = Array.isArray(data.addOnIds)
    ? data.addOnIds.filter((x): x is string => typeof x === "string")
    : q.addOnIds || [];
  const value =
    typeof q.estimatedProjectValue === "number"
      ? q.estimatedProjectValue
      : estimateInquiryValue(pkg?.id || "", addOnIds);
  const score = typeof q.leadScore === "number" ? q.leadScore : 50;
  const likelihood = typeof q.likelihoodToClose === "number" ? q.likelihoodToClose : 50;
  const priority = (q.priority as LeadPriority) || "medium";
  const grade = opportunityGrade(score);

  const feeling = str(data, "feelingPrompt");
  const inspiration = str(data, "inspirationPrompt");
  const purpose = str(data, "purpose") || feeling;
  const goals = str(data, "goals") || inspiration;
  const audience = str(data, "audience");
  const direction = str(data, "creativeDirection");
  const vision = str(data, "projectVision");
  const location = str(data, "location");
  const sessionSetting = str(data, "sessionSetting");
  const referral = str(data, "referralSource");

  const hasMood = Boolean(str(data, "moodBoardUrl"));
  const hasPin = Boolean(str(data, "pinterestLink"));
  const hasDrive = Boolean(str(data, "driveLink"));
  const hasIgRef = Boolean(str(data, "inspirationInstagram"));
  const hasWebsite = Boolean(str(data, "website"));
  const hasRefs = hasMood || hasPin || hasDrive || hasIgRef;

  const scoreReasons: string[] = [];
  if (pkg && pkg.startingPrice >= 900) scoreReasons.push("Premium / flagship package selected");
  else if (pkg && pkg.startingPrice >= 300) scoreReasons.push("Mid-to-premium experience selected");
  if (pkg?.family === "partnership") scoreReasons.push("Creative partnership intent (not a one-off session)");
  if (addOnIds.length >= 2) scoreReasons.push("Multiple add-ons — strong investment signal");
  else if (addOnIds.length === 1) scoreReasons.push("Premium add-on attached");
  if (value >= 5000) scoreReasons.push("High estimated investment");
  else if (value >= 900) scoreReasons.push("Solid estimated project value");
  if (feeling || vision || purpose) scoreReasons.push("Project vision captured in inquiry");
  if (str(data, "preferredDate") && location) scoreReasons.push("Date and location provided");
  if (!hasRefs) scoreReasons.push("Missing inspiration / visual references");
  if (pkg?.family === "partnership") scoreReasons.push("Excellent long-term partnership potential");
  if (/referral|friend|returning/i.test(referral)) scoreReasons.push("Warm referral channel");
  if (scoreReasons.length === 0) scoreReasons.push("Baseline inquiry — deepen in discovery");

  const executiveSummary = buildExecutiveSummary({
    pkg,
    value,
    priority,
    hasRefs,
    addOnCount: addOnIds.length,
    segment: q.crmSegment,
    feeling,
    goals,
  });

  const recommendedAction = buildRecommendedAction(pkg, priority, hasRefs);

  const suggestedQuestions = buildQuestions(pkg, {
    feeling,
    goals,
    audience,
    location,
    hasRefs,
    business: str(data, "businessName"),
  });

  const missingAssets = [
    { label: "Moodboard", missing: !hasMood && !hasPin, action: "Request Files" },
    { label: "Visual References", missing: !hasRefs, action: "Request Files" },
    { label: "Brand Assets", missing: !hasDrive && !hasWebsite, action: "Upload Link" },
    { label: "Launch Date", missing: !str(data, "preferredDate") && !str(data, "projectTimeline"), action: "Confirm Timeline" },
    { label: "Wardrobe Notes", missing: !str(data, "wardrobeNotes") && !direction, action: "Request Notes" },
    { label: "Logo Files", missing: !hasDrive, action: "Upload Link" },
    { label: "Usage Requirements", missing: !str(data, "usageRights") && !goals, action: "Clarify Usage" },
  ];

  const creativeDirection = buildCreativeDirection(pkg, feeling, inspiration, vision);

  const brief = {
    projectVision: paragraph(
      expandVision(feeling, vision, inspiration, pkg),
      "Vision will be refined in discovery — client has not yet articulated a full narrative.",
      280
    ),
    desiredEmotion: oneSentence(
      feeling ? inferEmotion(feeling) : "",
      "Emotion to be defined in consultation."
    ),
    primaryGoal: oneSentence(
      goals ? inferGoal(goals, pkg) : purpose ? inferGoal(purpose, pkg) : "",
      "Primary goal to be clarified before proposal."
    ),
    targetAudience: oneSentence(
      audience ? `Primary audience: ${audience}` : "",
      "Audience to be confirmed in discovery."
    ),
    story: paragraph(
      buildStory(feeling, goals, vision, pkg),
      "Narrative arc to be shaped in creative consultation.",
      260
    ),
    creativeInspiration: paragraph(
      buildInspirationInsight(hasRefs, hasMood, hasPin, hasDrive, hasIgRef, inspiration),
      "No visual inspiration on file — request references before locking direction.",
      220
    ),
    successDefinition: oneSentence(
      goals ? `Success looks like ${goals.replace(/^success (looks like|is|means)\s*/i, "")}` : "",
      "Success criteria to be defined with the client."
    ),
    creativeDirection,
  };

  const creative = buildCreativeRecs(pkg, sessionSetting, location, feeling);
  const salesSummary = buildSalesSummary(pkg, addOnIds, value, q.crmSegment);
  const salesStrategy = buildSalesStrategyView(pkg, priority, hasRefs, value, salesSummary);
  const risks = buildRisks(data, pkg, hasRefs, value);
  const upsells = buildUpsells(pkg, addOnIds, sessionSetting);
  const proposal = {
    status: "Draft not generated",
    investmentEstimate: `$${value.toLocaleString()} starting (estimated)`,
    approvalStatus: "Awaiting Human Approval",
    discoveryRequirement: hasRefs
      ? "Discovery recommended before final pricing"
      : "Discovery + visual references required before proposal approval",
    nextStep: pkg?.family === "partnership"
      ? "Schedule strategy consultation"
      : "Schedule creative consultation",
  };
  const ltvNum =
    typeof q.potentialLifetimeValue === "number"
      ? q.potentialLifetimeValue
      : Math.round(value * (pkg?.family === "partnership" ? 2.2 : 1.8));
  const bookingIntelligence = {
    opportunityGrade: grade,
    portfolioImpact:
      score >= 70
        ? "High — strong brand / portfolio showcase potential"
        : score >= 50
          ? "Medium — solid case study if executed well"
          : "Selective — protect portfolio standards",
    partnershipPotential:
      pkg?.family === "partnership"
        ? "Excellent — structured for ongoing creative access"
        : /referral|friend|returning/i.test(referral)
          ? "High — warm channel with repeat upside"
          : score >= 70
            ? "Strong — elevate to retainer conversation after delivery"
            : "Moderate — earn through white-glove delivery",
    longTermValue:
      pkg?.family === "partnership"
        ? "Very high — multi-campaign capacity"
        : "Moderate to high with strong delivery",
    estimatedLifetimeValue: ltvNum,
    profitMargin: `${Math.round(72)}% contribution model (estimated)`,
    creativeComplexity:
      pkg?.family === "partnership"
        ? "High — multi-touch creative system"
        : pkg?.family === "hybrid" || pkg?.family === "motion"
          ? "Elevated — photo + motion coordination"
          : "Moderate — directed stills production",
    schedulingDifficulty: str(data, "preferredDate")
      ? /outdoor|location/i.test(sessionSetting)
        ? "Medium — date set; weather-sensitive"
        : "Low–Medium — preferred date on file"
      : "High — no preferred date yet",
    brandAlignment:
      pkg?.family === "partnership" || value >= 1200
        ? "Excellent fit for ÉLEVÉ positioning"
        : "Good fit — elevate through consultation",
  };

  const advisor = buildAdvisor(grade, priority, hasRefs, pkg, score);

  return {
    executiveSummary,
    scoreReasons,
    recommendedAction,
    salesStrategy,
    suggestedQuestions,
    missingAssets,
    brief,
    creative,
    salesSummary,
    risks,
    upsells,
    proposal,
    bookingIntelligence,
    advisor,
    confidence: Math.round(
      clamp(
        0.55 +
          (pkg ? 0.12 : 0) +
          (feeling || vision ? 0.1 : 0) +
          (hasRefs ? 0.08 : 0) -
          (missingAssets.filter((a) => a.missing).length > 3 ? 0.08 : 0),
        0.45,
        0.92
      ) * 100
    ),
    metrics: {
      estimatedProjectValue: value,
      leadScore: score,
      likelihoodToClose: likelihood,
      priority,
    },
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildExecutiveSummary(opts: {
  pkg?: BookingPackage;
  value: number;
  priority: string;
  hasRefs: boolean;
  addOnCount: number;
  segment?: string;
  feeling: string;
  goals: string;
}): string {
  const { pkg, value, priority, hasRefs, addOnCount } = opts;
  const parts: string[] = [];

  if (pkg?.family === "partnership") {
    parts.push(
      "This inquiry represents a high-value branding opportunity with excellent long-term partnership potential."
    );
  } else if (value >= 1200) {
    parts.push("This inquiry represents a premium production opportunity with strong commercial upside.");
  } else if (value >= 500) {
    parts.push("This is a solid mid-to-premium booking with clear production scope.");
  } else {
    parts.push("This is an introductory inquiry that may grow with thoughtful consultation.");
  }

  if (addOnCount > 0) {
    parts.push("Premium add-ons indicate strong buying intent.");
  }

  if (priority === "urgent" || priority === "high") {
    parts.push("Discovery consultation is recommended before proposal approval.");
  } else {
    parts.push("A considered discovery step should precede any formal proposal.");
  }

  if (!hasRefs) {
    parts.push("Visual references remain outstanding.");
  }

  return parts.slice(0, 4).join(" ");
}

function expandVision(
  feeling: string,
  vision: string,
  inspiration: string,
  pkg?: BookingPackage
): string {
  const seed = uniqSentences([feeling, vision, inspiration].filter(Boolean));
  if (!seed) return "";
  const frame =
    pkg?.family === "partnership"
      ? "Position this as a recognizable brand system across campaigns"
      : pkg?.family === "motion"
        ? "Translate this into cinematic storytelling with platform-ready cuts"
        : "Elevate this into directed, editorial imagery with intentional composition";
  return `${seed} ${frame} — sharpening clarity, emotional continuity, and commercial usability.`;
}

function inferEmotion(feeling: string): string {
  return `Channel “${oneSentence(feeling, "clarity").replace(/\.$/, "")}” as the emotional through-line across every frame.`;
}

function inferGoal(goals: string, pkg?: BookingPackage): string {
  const g = oneSentence(goals, "").replace(/\.$/, "");
  if (!g) return "";
  return pkg?.family === "partnership"
    ? `Establish ongoing creative capacity that advances ${g.toLowerCase()}.`
    : `Deliver assets that directly support ${g.toLowerCase()}.`;
}

function buildStory(
  feeling: string,
  goals: string,
  vision: string,
  pkg?: BookingPackage
): string {
  const pieces = [feeling, goals, vision].filter(Boolean);
  if (pieces.length === 0) return "";
  const open = oneSentence(pieces[0], "A client-led creative narrative");
  const close =
    pkg?.family === "partnership"
      ? "The arc should move from identity clarity to a repeatable content system."
      : "The arc should move from emotional intent to a gallery that feels inevitable.";
  return `${open} ${close}`;
}

function buildInspirationInsight(
  hasRefs: boolean,
  hasMood: boolean,
  hasPin: boolean,
  hasDrive: boolean,
  hasIgRef: boolean,
  inspiration: string
): string {
  if (inspiration) {
    return `Client cues point toward ${oneSentence(inspiration, "refined references").replace(/\.$/, "")}. Expand these into a curated moodboard rather than copying them literally.`;
  }
  if (!hasRefs) return "";
  const sources = [
    hasMood && "mood board",
    hasPin && "Pinterest",
    hasDrive && "Drive folder",
    hasIgRef && "inspiration Instagram",
  ].filter(Boolean);
  return `References are attached via ${sources.join(", ")}. Distill shared motifs into lighting, palette, and composition rules before shoot day.`;
}

function buildSalesStrategyView(
  pkg: BookingPackage | undefined,
  priority: string,
  hasRefs: boolean,
  value: number,
  salesSummary: string
): SalesStrategyView {
  const action = buildRecommendedAction(pkg, priority, hasRefs);
  return {
    recommendedNextStep: action.primary,
    meetingType: pkg?.family === "partnership" ? "Strategy consultation" : "Creative consultation",
    estimatedLength: pkg?.family === "partnership" ? "30 minutes" : "20–30 minutes",
    salesStrategy: action.primaryGoal,
    confidenceLevel: Math.round(
      clamp(0.58 + (pkg ? 0.12 : 0) + (hasRefs ? 0.1 : 0) + (value >= 900 ? 0.08 : 0), 0.5, 0.92) * 100
    ),
    businessOpportunitySummary: salesSummary,
  };
}

function buildRecommendedAction(
  pkg: BookingPackage | undefined,
  priority: string,
  hasRefs: boolean
): LeadIntelView["recommendedAction"] {
  if (pkg?.family === "partnership") {
    return {
      primary: "Schedule a 30-minute strategy consultation within the next 12 hours.",
      primaryGoal: "Understand long-term vision and content cadence before discussing production details.",
      secondaryGoal: hasRefs
        ? "Confirm hour-bank usage plan and first production window."
        : "Collect visual references and define the first campaign priority.",
    };
  }
  if (priority === "urgent") {
    return {
      primary: "Personal outreach within 4 hours — propose two discovery windows.",
      primaryGoal: "Confirm urgency, date constraints, and decision-makers.",
      secondaryGoal: hasRefs
        ? "Align deliverables to launch timeline."
        : "Request mood board / references before drafting the proposal.",
    };
  }
  if (priority === "high") {
    return {
      primary: "Schedule a 20–30 minute discovery call within 12–24 hours.",
      primaryGoal: "Validate creative direction and investment fit.",
      secondaryGoal: hasRefs
        ? "Move toward a tailored proposal."
        : "Secure visual references and approval path.",
    };
  }
  return {
    primary: "Send a thoughtful follow-up within 1–2 business days with discovery options.",
    primaryGoal: "Qualify fit and surface missing brief details.",
    secondaryGoal: "Decide whether to propose, nurture, or politely decline.",
  };
}

function buildQuestions(
  pkg: BookingPackage | undefined,
  ctx: {
    feeling: string;
    goals: string;
    audience: string;
    location: string;
    hasRefs: boolean;
    business: string;
  }
): string[] {
  const qs: string[] = [];
  if (pkg?.family === "partnership") {
    qs.push("What does a successful first 90 days look like for your brand?");
    qs.push("How do you currently produce and approve content month to month?");
    qs.push("Which business outcomes should this partnership protect or accelerate?");
  } else if (pkg?.family === "motion") {
    qs.push("What is the primary platform and aspect ratio for the hero piece?");
    qs.push("Do you need a narrative film, social system, or both from this production?");
  } else if (pkg?.family === "hybrid" || /business|brand/i.test(pkg?.projectCategory || "")) {
    qs.push("Where will these assets live first — website, paid, organic, or press?");
    qs.push("Who is the final creative approver on your side?");
  } else {
    qs.push(
      ctx.feeling
        ? "Beyond the emotion you described, what must feel unmistakably ‘you’ on camera?"
        : "What should people feel the moment they encounter this work?"
    );
  }
  if (!ctx.audience) qs.push("Who is the primary audience for this work — and who is secondary?");
  if (!ctx.hasRefs) qs.push("Can you share 5–10 references that feel closest to the finish line?");
  if (ctx.business || pkg?.family === "partnership") {
    qs.push("Is there a launch, campaign, or business milestone we must protect?");
  } else {
    qs.push("Is there a hard date we must design production around?");
  }
  if (ctx.location) qs.push(`For ${ctx.location} — any access, permit, or privacy constraints we should know?`);
  else qs.push("Where should production live — studio, on-location, or hybrid?");
  return qs.slice(0, 6);
}

function buildCreativeDirection(
  pkg: BookingPackage | undefined,
  feeling: string,
  inspiration: string,
  vision: string
): string {
  const tone = feeling || inspiration || vision;
  const base =
    pkg?.family === "motion"
      ? "cinematic motion language, intentional pacing, and elevated color"
      : pkg?.family === "partnership"
        ? "a cohesive brand system across stills and motion"
        : "cinematic lighting, premium production design, and elevated composition";
  if (tone) {
    const seed = oneSentence(tone, "clarity").replace(/\.$/, "");
    return `Inspired by the client’s intent around “${seed},” modernize the aesthetic through ${base}. Expand their cues into a directed visual language rather than restating the brief.`;
  }
  return `Modernize the aesthetic through ${base}, keeping ÉLEVÉ’s editorial restraint and commercial clarity.`;
}

function buildCreativeRecs(
  pkg: BookingPackage | undefined,
  sessionSetting: string,
  location: string,
  feeling: string
): CreativeRecommendations {
  const outdoor = /outdoor|location|on.?location/i.test(sessionSetting);
  const studio = /studio|indoor/i.test(sessionSetting);
  const motion = pkg?.family === "motion" || pkg?.family === "hybrid";
  return {
    photographyStyle:
      pkg?.family === "partnership"
        ? "Campaign-ready brand photography — consistent, elevated, reusable"
        : feeling
          ? "Directed editorial portraiture with emotional clarity"
          : "Clean editorial portraiture with intentional posing",
    videoStyle: motion
      ? pkg?.id === "films" || pkg?.id === "cinema"
        ? "Story-driven cinematic production with hero + vertical cuts"
        : "Short-form cinematic social with graded finish"
      : "Optional BTS / social accents if upsold",
    colorPalette: motion
      ? "Restrained cinematic grade — rich midtones, controlled contrast"
      : "Natural skin fidelity with refined contrast and soft filmic warmth",
    lightingStyle: studio
      ? "Controlled key + fill, clean catchlights, optional rim separation"
      : outdoor
        ? "Golden-hour priority with portable fill / negative fill"
        : "Adaptive mixed lighting — shape with practicals and portable key",
    lensSuggestions: motion
      ? "24–35mm environment · 50–85mm interview / detail"
      : "35mm / 50mm / 85mm portrait set",
    cameraMovement: motion
      ? "Motivated moves — slider / gimbal accents, locked-off heroes"
      : "Primarily locked and intentional stills; optional subtle motion accents",
    editingStyle: motion
      ? "Narrative pacing, sound-led cuts, platform-native exports"
      : "Selective cull, premium retouch, cohesive gallery sequence",
    musicDirection: motion
      ? "Licensed, brand-safe score — emotional without overpowering voice"
      : "N/A for photo-led (score only if motion is added)",
    wardrobeSuggestions:
      pkg?.startingPrice && pkg.startingPrice >= 300
        ? "Pre-planned looks aligned to moodboard — texture over logos"
        : "One refined look; optional second outfit if upsold",
    locationIdeas: location
      ? `Anchor in ${location}; scout backup for weather / access`
      : studio
        ? "Confirm studio block + seamless options"
        : "Propose 1–2 signature Northern California locations after discovery",
    productionComplexity:
      pkg?.family === "partnership"
        ? "High — multi-session creative system"
        : motion
          ? "Elevated — dual stills/motion workflow"
          : "Moderate — single directed production",
  };
}

function buildSalesSummary(
  pkg: BookingPackage | undefined,
  addOnIds: string[],
  value: number,
  segment?: string
): string {
  const addOnNames = addOnIds
    .map((id) => getAddOnById(id)?.name)
    .filter(Boolean)
    .join(", ");
  if (pkg?.family === "partnership") {
    return `Client independently selected ${pkg.name}, signaling investment confidence and long-term partnership intent (~$${value.toLocaleString()} starting). Position discovery around business growth and creative capacity — not a price list of deliverables.${addOnNames ? ` Attached: ${addOnNames}.` : ""}`;
  }
  if (pkg) {
    return `Client self-selected ${pkg.name}${addOnNames ? ` with ${addOnNames}` : ""} (~$${value.toLocaleString()} estimated). Lead with creative partnership framing and a clear next step into discovery.${segment ? ` Segment: ${segment}.` : ""}`;
  }
  return `Experience not locked — use discovery to recommend the right tier before proposing (~$${value.toLocaleString()} signal).`;
}

function buildRisks(
  data: Record<string, unknown>,
  pkg: BookingPackage | undefined,
  hasRefs: boolean,
  value: number
): StructuredRisk[] {
  const outdoor = /outdoor|location|on.?location/i.test(str(data, "sessionSetting"));
  const hasDate = Boolean(str(data, "preferredDate"));
  return [
    {
      category: "Scheduling",
      level: hasDate ? "Low" : "High",
      note: hasDate ? "Preferred date on file." : "No preferred date — conversion and planning risk.",
      recommendation: hasDate
        ? "Confirm hold windows in discovery."
        : "Collect 2–3 date options before proposal.",
    },
    {
      category: "Weather",
      level: outdoor ? "Medium" : "Low",
      note: outdoor ? "On-location exposure." : "Studio / indoor controlled.",
      recommendation: outdoor ? "Lock backup cover location." : "Maintain indoor plan.",
    },
    {
      category: "Budget",
      level: value >= 900 || pkg?.family === "partnership" ? "Low" : value < 200 ? "High" : "Medium",
      note: "Investment signal from package + add-ons.",
      recommendation: "Confirm scope vs investment in discovery — do not under-quote.",
    },
    {
      category: "Creative",
      level: hasRefs ? "Low" : "High",
      note: hasRefs ? "References attached." : "Missing visual references.",
      recommendation: hasRefs ? "Translate refs into shot list." : "Request mood board before proposal.",
    },
    {
      category: "Timeline",
      level: str(data, "projectTimeline") || hasDate ? "Medium" : "High",
      note: "Delivery pressure tracks launch clarity.",
      recommendation: "Define preview and final delivery windows after discovery.",
    },
    {
      category: "Approvals",
      level: str(data, "businessName") ? "Medium" : "Low",
      note: str(data, "businessName")
        ? "Business stakeholder likely in loop."
        : "Likely single decision-maker.",
      recommendation: "Identify final approver early.",
    },
  ];
}

function buildUpsells(
  pkg: BookingPackage | undefined,
  addOnIds: string[],
  sessionSetting: string
): StructuredUpsell[] {
  const out: StructuredUpsell[] = [];
  const candidates = (pkg?.recommendedAddOnIds || []).filter((id) => !addOnIds.includes(id));
  for (const id of candidates.slice(0, 4)) {
    const a = getAddOnById(id);
    if (!a) continue;
    out.push({
      name: a.name,
      priority: a.startingPrice >= 150 ? "High" : "Medium",
      reason: a.whyItMatters,
      impact: `Strengthens ${pkg?.family === "motion" ? "motion deliverables" : "production quality"} and client confidence.`,
      estimatedValue: a.startingPrice,
    });
  }
  if (/outdoor|location|on.?location/i.test(sessionSetting) && !addOnIds.includes("studio-rental")) {
    out.unshift({
      name: "Studio Rental",
      priority: "High",
      reason: "Ensures weather consistency and complete lighting control.",
      impact: "Higher production quality and fewer scheduling risks.",
      estimatedValue: getAddOnById("studio-rental")?.startingPrice || 250,
    });
  }
  if (pkg?.id === "foundations") {
    out.unshift({
      name: "Upgrade to ÉLEVÉ Signature",
      priority: "High",
      reason: "Adds creative consultation, moodboard, and more usable selects.",
      impact: "Higher AOV and stronger portfolio outcome.",
      estimatedValue: 150,
    });
  }
  if (pkg && pkg.family !== "partnership" && (pkg.startingPrice || 0) >= 650) {
    out.push({
      name: "Introduce ÉLEVÉ Reserve",
      priority: "Medium",
      reason: "Client may need ongoing creative access beyond a single day.",
      impact: "Converts one-off into partnership revenue.",
      estimatedValue: 5000,
    });
  }
  // Dedupe by name
  const seen = new Set<string>();
  return out
    .filter((u) => {
      if (seen.has(u.name)) return false;
      seen.add(u.name);
      return true;
    })
    .slice(0, 4);
}

function buildProposal(
  pkg: BookingPackage | undefined,
  vision: string,
  direction: string
): { status: string; investmentEstimate: string; approvalStatus: string; discoveryRequirement: string; nextStep: string } {
  void vision;
  void direction;
  return {
    status: "Draft not generated",
    investmentEstimate: "See Lead Intelligence",
    approvalStatus: "Awaiting Human Approval",
    discoveryRequirement: "Discovery required before final proposal",
    nextStep: pkg?.family === "partnership"
      ? "Discovery Strategy Session"
      : "Creative Consultation → Tailored Proposal",
  };
}

function buildAdvisor(
  grade: OpportunityGrade,
  priority: string,
  hasRefs: boolean,
  pkg: BookingPackage | undefined,
  score: number
): string[] {
  const lines: string[] = [];
  if (grade === "A+" || grade === "A" || priority === "urgent") {
    lines.push("Prioritize this opportunity in today’s queue.");
  } else {
    lines.push("Work this lead with intention — qualify before heavy proposal effort.");
  }
  if (score >= 70) lines.push("Strong buying intent signals present.");
  lines.push(
    pkg?.family === "partnership"
      ? "Lead discovery with strategy and growth — delay pricing detail."
      : "Hold a short discovery before sending a full proposal."
  );
  if (pkg?.family === "partnership" || score >= 80) {
    lines.push("Potential annual / repeat client.");
  }
  if (score >= 65) lines.push("High portfolio and referral upside if delivery is white-glove.");
  if (!hasRefs) lines.push("Block proposal approval until visual references arrive.");
  return lines.slice(0, 6);
}
