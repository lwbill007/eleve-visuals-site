import { test, expect } from "@playwright/test";
import { OS_PAGES } from "../src/lib/ai/platform/os-systems";

/**
 * Smoke every primary OS nav href.
 * Asserts AdminShell chrome renders and the module error boundary does not fire.
 */
test.describe("Admin OS navigation smoke", () => {
  for (const page of OS_PAGES) {
    test(`${page.system} · ${page.label} (${page.href})`, async ({ page: browserPage }) => {
      const response = await browserPage.goto(page.href, { waitUntil: "domcontentloaded" });
      expect(response, `No response for ${page.href}`).toBeTruthy();
      expect(response!.status(), `HTTP status for ${page.href}`).toBeLessThan(500);

      // Error boundary copy from src/app/admin/error.tsx
      await expect(browserPage.getByText("This module failed to load")).toHaveCount(0);
      await expect(browserPage.getByText("Something broke")).toHaveCount(0);

      // Shell brand chrome present on authenticated admin pages
      await expect(browserPage.getByText("ÉLEVÉ OS").first()).toBeVisible({ timeout: 20_000 });
    });
  }
});
