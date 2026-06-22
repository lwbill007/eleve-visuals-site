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
  revalidatePath("/sessions");
  if (slug) revalidatePath(`/sessions/${slug}`);
}
