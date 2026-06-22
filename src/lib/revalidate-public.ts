import { revalidatePath } from "next/cache";

export function revalidateHomepage() {
  revalidatePath("/");
}

export function revalidatePortfolioPages(slug?: string) {
  revalidatePath("/");
  revalidatePath("/portfolio");
  if (slug) revalidatePath(`/portfolio/${slug}`);
}

export function revalidateSessionPages(slug?: string) {
  revalidatePath("/");
  revalidatePath("/sessions");
  if (slug) revalidatePath(`/sessions/${slug}`);
}

export function revalidateServicesPages() {
  revalidatePath("/");
  revalidatePath("/services");
}

export function revalidateSiteLayout() {
  revalidatePath("/", "layout");
}

export function revalidateAboutPage() {
  revalidatePath("/about");
}

export function revalidateContactPage() {
  revalidatePath("/contact");
}

export function revalidateBookPage() {
  revalidatePath("/book");
}

const CONTENT_KEY_REVALIDATORS: Record<string, () => void> = {
  hero: revalidateHomepage,
  homepage: revalidateHomepage,
  brandStory: revalidateHomepage,
  siteConfig: revalidateSiteLayout,
  navigation: revalidateSiteLayout,
  about: revalidateAboutPage,
  contactPage: revalidateContactPage,
  servicesPage: revalidateServicesPages,
  servicesIntro: revalidateServicesPages,
  pageCopy: () => {
    revalidateHomepage();
    revalidatePortfolioPages();
    revalidateServicesPages();
    revalidateAboutPage();
    revalidateBookPage();
    revalidateSessionPages();
  },
  bookingOptions: revalidateBookPage,
  bookingTerms: () => revalidatePath("/booking-terms"),
  faq: revalidateServicesPages,
  sessionsApplication: revalidateSessionPages,
  portfolioPage: revalidatePortfolioPages,
};

export function revalidateContentKey(key: string) {
  CONTENT_KEY_REVALIDATORS[key]?.();
}
