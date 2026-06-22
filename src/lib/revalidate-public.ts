import { revalidatePath } from "next/cache";

export function revalidateHomepage() {
  revalidatePath("/");
}

export function revalidatePortfolioPages() {
  revalidatePath("/");
  revalidatePath("/portfolio");
}

export function revalidateSessionPages(slug?: string) {
  revalidatePath("/sessions");
  if (slug) revalidatePath(`/sessions/${slug}`);
}
