import { PrismaClient } from "@prisma/client";
import {
  CONTENT_KEYS,
  DEFAULT_ABOUT,
  DEFAULT_BOOKING_OPTIONS,
  DEFAULT_BOOKING_TERMS,
  DEFAULT_BRAND_STORY,
  DEFAULT_CONTACT_PAGE,
  DEFAULT_FAQ,
  DEFAULT_HERO,
  DEFAULT_PAGE_COPY,
  DEFAULT_SERVICES,
  DEFAULT_SERVICES_INTRO,
  DEFAULT_SESSIONS,
  DEFAULT_SESSIONS_APPLICATION,
  DEFAULT_SITE_CONFIG,
} from "../src/lib/defaults";

const prisma = new PrismaClient();

async function seedContent() {
  const entries: [string, unknown][] = [
    [CONTENT_KEYS.siteConfig, DEFAULT_SITE_CONFIG],
    [CONTENT_KEYS.hero, DEFAULT_HERO],
    [CONTENT_KEYS.brandStory, DEFAULT_BRAND_STORY],
    [CONTENT_KEYS.faq, DEFAULT_FAQ],
    [CONTENT_KEYS.contactPage, DEFAULT_CONTACT_PAGE],
    [CONTENT_KEYS.about, DEFAULT_ABOUT],
    [CONTENT_KEYS.sessions, DEFAULT_SESSIONS],
    [CONTENT_KEYS.sessionsApplication, DEFAULT_SESSIONS_APPLICATION],
    [CONTENT_KEYS.servicesIntro, DEFAULT_SERVICES_INTRO],
    [CONTENT_KEYS.bookingOptions, DEFAULT_BOOKING_OPTIONS],
    [CONTENT_KEYS.bookingTerms, DEFAULT_BOOKING_TERMS],
    [CONTENT_KEYS.pageCopy, DEFAULT_PAGE_COPY],
  ];

  for (const [key, value] of entries) {
    await prisma.siteContent.upsert({
      where: { key },
      create: { key, value: JSON.stringify(value) },
      update: {},
    });
  }
}

async function seedServices() {
  const count = await prisma.service.count();
  if (count > 0) return;

  for (const service of DEFAULT_SERVICES) {
    await prisma.service.create({
      data: {
        slug: service.slug,
        title: service.title,
        tagline: service.tagline,
        description: service.description,
        forWhom: service.forWhom,
        includes: JSON.stringify(service.includes),
        startingPrice: service.startingPrice,
        imageAlt: service.imageAlt,
        sortOrder: service.sortOrder,
        published: true,
      },
    });
  }
}

async function seedSessionVolumes() {
  const count = await prisma.sessionVolume.count();
  if (count > 0) return;

  const timeline = JSON.stringify([
    { label: "Application Opens", detail: "Now accepting applications" },
    { label: "Applications Close", detail: "" },
    { label: "Selection", detail: "Reviewed individually" },
    { label: "Shoot Day", detail: "" },
    { label: "Final Delivery", detail: "Portfolio selects delivered" },
  ]);

  const requirements = JSON.stringify([
    "Models, photographers, stylists, and creatives with a strong portfolio",
    "Willingness to collaborate under a unified creative direction",
    "Professional conduct on set",
  ]);

  await prisma.sessionVolume.create({
    data: {
      volumeNumber: 3,
      title: "MASK OFF",
      slug: "mask-off",
      theme: "Identity & Vulnerability",
      subtitle: "The only face without a mask tells the whole story.",
      synopsis:
        "A cinematic study of truth beneath performance — where shadow, skin, and silence carry more weight than spectacle.\n\nÉLEVÉ Sessions Vol. 3 invites a limited roster of creatives to strip away artifice and build imagery that feels raw, editorial, and unforgettable.",
      status: "applications_open",
      genre: "Editorial / Portrait",
      year: "2026",
      sessionDate: "TBA",
      sessionTime: "TBA",
      location: "Sacramento, CA — shared upon acceptance",
      city: "Sacramento, CA",
      capacity: "Limited capacity",
      category: "ÉLEVÉ Sessions",
      creativeDirector: "ÉLEVÉ Visuals",
      dressCode: "Monochrome layers, minimal jewelry, clean silhouettes",
      runtime: "One-day production",
      requirements,
      timeline,
      featured: true,
      published: true,
      showApplyButton: true,
      seoTitle: "MASK OFF — ÉLEVÉ Sessions Vol. 3",
      seoDescription:
        "Apply for ÉLEVÉ Sessions Vol. 3: MASK OFF — a limited creative production on identity and vulnerability.",
    },
  });

  await prisma.sessionVolume.create({
    data: {
      volumeNumber: 2,
      title: "AFTER DARK",
      slug: "after-dark",
      theme: "Nocturnal Editorial",
      subtitle: "Shadow, texture, and controlled tension.",
      synopsis:
        "A nocturnal visual study — editorial portraiture meets underground cinema. Archived volume from the ÉLEVÉ Sessions collection.",
      status: "archived",
      genre: "Editorial",
      year: "2025",
      sessionDate: "Completed",
      city: "Sacramento, CA",
      capacity: "Closed",
      requirements: JSON.stringify([]),
      timeline: JSON.stringify([]),
      featured: false,
      published: true,
      showApplyButton: false,
    },
  });
}

async function main() {
  await seedContent();
  await seedServices();
  await seedSessionVolumes();
  console.log("Database seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
