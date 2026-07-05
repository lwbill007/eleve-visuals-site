export * from "./types";
export { buildBrandInstitutionalMemory, getBrandInstitutionalMemory } from "./brand-memory";
export {
  listCampaignCaseStudies,
  registerCampaign,
  registerCampaignFromGeneration,
  updateCampaignMetrics,
} from "./campaign-memory";
export { discoverMarketingPatterns, getStoredPatterns } from "./learning-engine";
export { recommendExperiments, declareExperimentWinner } from "./experiment-engine";
export { generateMarketingPredictions } from "./prediction-engine";
export { listCompetitorProfiles, upsertCompetitorProfile, analyzeCompetitiveOpportunities } from "./competitive-intel";
export { buildClientMarketingProfiles } from "./client-intel";
export { rankMarketingRevenue } from "./revenue-intel";
export { computeCMOScores } from "./cmo-scores";
export { getCMOIntelligence, syncCMOMemory } from "./cmo-intelligence";
