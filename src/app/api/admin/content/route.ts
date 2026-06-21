import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { contentSetters } from "@/lib/content";
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
  getBookingOptions,
  getPageCopy,
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
  bookingOptions: getBookingOptions,
  pageCopy: getPageCopy,
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

  const { key, value } = await request.json();
  if (!(key in contentSetters)) {
    return NextResponse.json({ error: "Invalid content key" }, { status: 400 });
  }

  const setter = contentSetters[key as keyof typeof contentSetters];
  await setter(value);
  return NextResponse.json({ ok: true });
}
