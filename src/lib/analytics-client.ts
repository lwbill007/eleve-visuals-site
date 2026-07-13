"use client";

const SESSION_KEY = "eleve-analytics-session";
const EXPERIMENT_KEY = "eleve-experiment-variant";

export type EngagementEvent =
  | "form_step"
  | "cta_click"
  | "scroll_depth"
  | "section_view"
  | "funnel";

export type FunnelLabel =
  | "homepage_loaded"
  | "hero_cta_clicked"
  | "portfolio_viewed"
  | "session_viewed"
  | "booking_started"
  | "booking_step_1"
  | "booking_step_2"
  | "booking_step_3"
  | "booking_step_4"
  | "submission_completed";

export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Persist A/B variant for attribution on funnel events. */
export function setExperimentVariant(variant: string | null | undefined) {
  if (typeof window === "undefined") return;
  if (!variant) {
    sessionStorage.removeItem(EXPERIMENT_KEY);
    return;
  }
  sessionStorage.setItem(EXPERIMENT_KEY, variant.slice(0, 64));
}

export function getExperimentVariant(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(EXPERIMENT_KEY);
}

function deviceType(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 768px)").matches ? "mobile" : "desktop";
}

export function trackPageView(path: string) {
  const params = new URLSearchParams(window.location.search);

  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path,
      referrer: document.referrer || null,
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
      sessionId: getAnalyticsSessionId(),
    }),
    keepalive: true,
  }).catch(() => {});
}

export function trackConversion(type: "booking" | "contact" | "session") {
  if (typeof window !== "undefined" && window.plausible) {
    window.plausible("Conversion", { props: { type } });
  }
}

export function trackEngagement(input: {
  event: EngagementEvent;
  path?: string;
  label?: string;
  step?: number;
  depth?: number;
  metadata?: Record<string, unknown>;
}) {
  const experiment = getExperimentVariant();
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      path: input.path ?? window.location.pathname,
      sessionId: getAnalyticsSessionId(),
      metadata: {
        device: deviceType(),
        ...(experiment ? { experimentVariant: experiment } : {}),
        ...input.metadata,
      },
    }),
    keepalive: true,
  }).catch(() => {});
}

/** Named conversion-funnel stages for ÉLEVÉ OS Conversion Dashboard. */
export function trackFunnel(
  label: FunnelLabel,
  extras?: { path?: string; step?: number; metadata?: Record<string, unknown> }
) {
  trackEngagement({
    event: "funnel",
    label,
    path: extras?.path,
    step: extras?.step,
    metadata: extras?.metadata,
  });
}

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}
