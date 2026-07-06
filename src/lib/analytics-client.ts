"use client";

const SESSION_KEY = "eleve-analytics-session";

export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
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
  event: "form_step" | "cta_click" | "scroll_depth" | "section_view";
  path?: string;
  label?: string;
  step?: number;
  depth?: number;
  metadata?: Record<string, unknown>;
}) {
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      path: input.path ?? window.location.pathname,
      sessionId: getAnalyticsSessionId(),
    }),
    keepalive: true,
  }).catch(() => {});
}

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}
