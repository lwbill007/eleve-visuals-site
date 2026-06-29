import type { SessionVolumeStatus } from "./types";
import type { SessionIconName } from "@/components/sessions/SessionIcon";

export interface VolumeCategory {
  id: string;
  label: string;
  blurb: string;
  statuses: SessionVolumeStatus[];
}

/** Browse rails, ordered by anticipation: what you can join first, then what's coming, then the archive. */
export const VOLUME_CATEGORIES: VolumeCategory[] = [
  { id: "now-casting", label: "Now Casting", blurb: "Open for applications", statuses: ["applications_open"] },
  { id: "coming-soon", label: "Coming Soon", blurb: "Announced productions", statuses: ["coming_soon"] },
  { id: "in-production", label: "In Production", blurb: "Cast and rolling", statuses: ["applications_closed", "sold_out"] },
  { id: "archive", label: "The Archive", blurb: "Past volumes", statuses: ["completed", "archived"] },
];

export interface TimelineStage {
  step: string;
  title: string;
  description: string;
}

export const PRODUCTION_TIMELINE: TimelineStage[] = [
  { step: "01", title: "Applications", description: "Submit your portfolio and creative profile for the Volume." },
  { step: "02", title: "Casting", description: "We curate a balanced ensemble — every role intentional." },
  { step: "03", title: "Pre-Production", description: "Moodboards, wardrobe, and call sheets shared with the cast." },
  { step: "04", title: "Shoot Day", description: "A fully directed, cinematic production from call to wrap." },
  { step: "05", title: "Post-Production", description: "Hand-retouched edits, social cuts, and the recap film." },
  { step: "06", title: "Gallery Release", description: "Your work published to the permanent ÉLEVÉ archive." },
  { step: "07", title: "Awards", description: "The standout work of the Volume is recognized." },
];

export interface ExperiencePillar {
  icon: SessionIconName;
  title: string;
  description: string;
}

export const WHY_JOIN_PILLARS: ExperiencePillar[] = [
  { icon: "sparkle", title: "Creative Growth", description: "Work under real direction on a produced set and push your craft further than a solo shoot ever could." },
  { icon: "users", title: "The Network", description: "Build with the photographers, stylists, MUAs, and artists shaping the scene — relationships that outlast the shoot." },
  { icon: "image", title: "Portfolio", description: "Walk away with editorial-grade, fully retouched work built around a singular concept." },
  { icon: "award", title: "Recognition", description: "Earn awards and features that follow your name across every Volume." },
  { icon: "grid", title: "The Archive", description: "Become a permanent part of the ÉLEVÉ body of work — your Volume lives on." },
  { icon: "gift", title: "What's Next", description: "Alumni get first access to future Volumes and ALTIER productions before anyone else." },
];

export const AWARD_CATEGORIES: ExperiencePillar[] = [
  { icon: "award", title: "Best Editorial", description: "The standout story of the Volume." },
  { icon: "star", title: "People's Choice", description: "Voted by the ÉLEVÉ community." },
  { icon: "sparkle", title: "Breakthrough Talent", description: "The new name everyone remembers." },
  { icon: "gem", title: "Best Styling", description: "Wardrobe that defined the frame." },
  { icon: "compass", title: "Best Concept", description: "The vision that set the tone." },
  { icon: "camera", title: "Best Cinematography", description: "Light, motion, and mood in command." },
];

export const CREATIVE_DISCIPLINES = [
  "Photographers",
  "Models",
  "Stylists",
  "MUAs",
  "Designers",
  "Videographers",
  "Set Design",
  "Direction",
];
