import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { contentSetters } from "@/lib/content";
import { logActivity } from "@/lib/activity-log";
import { revalidateContentKey } from "@/lib/revalidate-public";
import {
  getSiteConfig,
  getHeroContent,
  getBrandStory,
  getFaqItems,
  getContactPage,
  getAboutContent,
  getSessionsContent,
  getSessionsApplicationContent,
  getServicesIntro,
  getServicesPageContent,
  getBookingOptions,
  getBookingTerms,
  getPageCopy,
  getHomepageContent,
  getNavigationConfig,
  getPortfolioPageContent,
  getNotificationSettings,
} from "@/lib/content";

const GETTERS = {
  siteConfig: getSiteConfig,
  hero: getHeroContent,
  brandStory: getBrandStory,
  faq: getFaqItems,
  contactPage: getContactPage,
  about: getAboutContent,
  sessions: getSessionsContent,
  sessionsApplication: getSessionsApplicationContent,
  servicesIntro: getServicesIntro,
  servicesPage: getServicesPageContent,
  bookingOptions: getBookingOptions,
  bookingTerms: getBookingTerms,
  pageCopy: getPageCopy,
  homepage: getHomepageContent,
  navigation: getNavigationConfig,
  portfolioPage: getPortfolioPageContent,
  notificationSettings: getNotificationSettings,
} as const;

const ALLOWED_KEYS = Object.keys(GETTERS) as (keyof typeof GETTERS)[];

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") as keyof typeof GETTERS | null;

  if (key && ALLOWED_KEYS.includes(key)) {
    const value = await GETTERS[key]();
    return NextResponse.json({ key, value });
  }

  const all = await Promise.all(
    ALLOWED_KEYS.map(async (k) => ({ key: k, value: await GETTERS[k]() }))
  );
  return NextResponse.json(all);
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { key, value } = body as { key?: string; value?: unknown };
    if (!key || !(key in contentSetters)) {
      return NextResponse.json({ error: "Invalid content key" }, { status: 400 });
    }

    const setter = contentSetters[key as keyof typeof contentSetters];
    await (setter as (v: unknown) => Promise<void>)(value);
    revalidateContentKey(key);

    if (key === "notificationSettings") {
      const v = value as {
        notificationEmails?: string[];
        emailEnabled?: boolean;
        smsEnabled?: boolean;
        pushEnabled?: boolean;
        webhookEnabled?: boolean;
        digestFrequency?: string;
      } | null;
      const channels = [
        v?.emailEnabled ? "email" : null,
        v?.smsEnabled ? "sms" : null,
        v?.pushEnabled ? "push" : null,
        v?.webhookEnabled ? "webhook" : null,
      ].filter(Boolean);
      void logActivity({
        action: "settings.update",
        target: "notification settings",
        details: `Channels: ${channels.join(", ") || "none"}; recipients: ${
          v?.notificationEmails?.length ?? 0
        }; digest: ${v?.digestFrequency ?? "off"}`,
        request,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save content" }, { status: 500 });
  }
}
