import { charterSystemPrompt, charterResponseStructure } from "../executive/charter";

export const ELEVÉ_BRAND_VOICE = charterSystemPrompt();

export function systemPromptForExecutive(): string {
  return `${charterSystemPrompt()}

${charterResponseStructure()}`;
}

/** @deprecated Use systemPromptForExecutive */
export function systemPromptForAssistant(): string {
  return systemPromptForExecutive();
}

export function systemPromptForTask(task: string): string {
  return `${charterSystemPrompt()}

Task: ${task}
Output only the requested content. Every output must serve measurable business outcomes — revenue, bookings, or brand value.
No preamble unless asked. Mark outbound copy as DRAFT.`;
}

export const TASK_PROMPTS: Record<string, string> = {
  email_subject: "Write 3 compelling email subject lines. Under 60 characters each. ÉLEVÉ luxury tone. Optimize for opens that lead to bookings.",
  email_body: "Write email body copy. Clear CTA toward booking or consultation. ÉLEVÉ luxury tone. Mark as DRAFT.",
  follow_up: "Write a warm follow-up email for a photography client. Personal, not salesy. Goal: re-engage toward booking. DRAFT.",
  campaign: "Write a marketing campaign email. Hook, story, CTA toward qualified inquiry. DRAFT.",
  instagram_caption: "Write an Instagram caption with subtle hashtags. Cinematic, editorial tone. Include hook that drives profile visits or DMs.",
  instagram_story: "Write a 3-slide Instagram Story sequence. Slide 1 hook, slide 2 value, slide 3 CTA to book. ÉLEVÉ tone.",
  blog_post: "Write a blog post outline + opening paragraph. SEO-friendly, ÉLEVÉ voice. Target qualified portrait inquiries.",
  seo_meta: "Write meta title (≤60 chars) and meta description (≤155 chars). Optimize for qualified search traffic.",
  alt_text: "Write accessible alt text for a photography image. Descriptive, concise.",
  client_summary: "Summarize this client's relationship with the studio. Bullet points. Include upsell and retention opportunities.",
  analytics_explain: "Explain this chart data: summary, trend, root cause, revenue recommendation, opportunity, risk.",
  sponsor_report: "Write executive summary for a sponsor deck. Data-driven, premium tone.",
  session_email: "Write ÉLEVÉ Sessions acceptance or follow-up email. Cinematic, community-focused. DRAFT.",
  automation_workflow: "Describe an automation workflow as numbered steps with triggers, delays, and email templates. Focus on recovering revenue and reducing manual follow-up.",
  facebook_post: "Write a Facebook post. Professional, cinematic, luxury photography studio tone. CTA toward inquiry.",
  pinterest_pin: "Write Pinterest pin title and description. SEO keywords, ÉLEVÉ aesthetic. Drive traffic to portfolio.",
  tiktok_caption: "Write a TikTok caption. Short, cinematic, hook-first. Drive profile visits.",
  newsletter: "Write a full newsletter. Subject, preview text, body, CTA toward booking. ÉLEVÉ luxury tone. DRAFT.",
  launch_campaign: "Write a product launch campaign across channels. Hook, story, timeline, CTAs. DRAFT.",
  threads_post: "Write a Threads post. Conversational but refined. ÉLEVÉ voice.",
  general: "Respond as the executive intelligence platform. Lead with business impact, not conversation.",
};
