const MIN_FORM_SECONDS = 3;

export interface SpamCheckResult {
  isSpam: boolean;
  silent?: boolean;
  message?: string;
}

export function checkHoneypot(body: Record<string, unknown>): SpamCheckResult {
  const hp = body._hp;
  if (typeof hp === "string" && hp.length > 0) {
    return { isSpam: true, silent: true };
  }
  return { isSpam: false };
}

export function checkFormTiming(body: Record<string, unknown>): SpamCheckResult {
  const ts = body._ts;
  if (typeof ts !== "number") {
    return { isSpam: true, message: "Invalid submission" };
  }

  const elapsedSec = (Date.now() - ts) / 1000;
  if (elapsedSec < MIN_FORM_SECONDS) {
    return { isSpam: true, silent: true };
  }

  if (elapsedSec > 60 * 60 * 24) {
    return { isSpam: true, message: "Form expired. Please refresh and try again." };
  }

  return { isSpam: false };
}

export async function verifyTurnstile(token: string | undefined): Promise<SpamCheckResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!secret || !siteKey) return { isSpam: false };

  if (!token) {
    return { isSpam: true, message: "Please complete the security check." };
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });

    const data = (await res.json()) as { success?: boolean };
    if (!data.success) {
      return { isSpam: true, message: "Security check failed. Please try again." };
    }
  } catch {
    return { isSpam: true, message: "Security check unavailable. Please try again later." };
  }

  return { isSpam: false };
}

export async function runSpamChecks(body: Record<string, unknown>): Promise<SpamCheckResult> {
  const honeypot = checkHoneypot(body);
  if (honeypot.isSpam) return honeypot;

  const timing = checkFormTiming(body);
  if (timing.isSpam) return timing;

  const turnstile = await verifyTurnstile(
    typeof body.turnstileToken === "string" ? body.turnstileToken : undefined
  );
  if (turnstile.isSpam) return turnstile;

  return { isSpam: false };
}

export function stripSpamFields(body: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...body };
  delete rest._hp;
  delete rest._ts;
  delete rest.turnstileToken;
  delete rest._sessionId;
  return rest;
}
