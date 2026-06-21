import { PrismaClient } from "@prisma/client";
import {
  CONTENT_KEYS,
  DEFAULT_ABOUT,
  DEFAULT_BOOKING_OPTIONS,
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

async function main() {
  await seedContent();
  await seedServices();
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
