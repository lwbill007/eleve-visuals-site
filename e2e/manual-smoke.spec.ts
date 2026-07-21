import { test, expect, type Page } from "@playwright/test";

/**
 * Manual smoke checklist — run against staging/production:
 *   PLAYWRIGHT_BASE_URL=https://your-site.vercel.app npm run test:smoke
 *
 * Requires E2E_ADMIN_PASSWORD (or ADMIN_PASSWORD) matching the target environment.
 */

function futureDate(days = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function adminField(page: Page, label: string) {
  return page
    .locator(".space-y-2")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("input, textarea")
    .first();
}

async function waitForSpamTiming(page: Page) {
  await page.waitForTimeout(3500);
}

test.describe("Manual smoke — public pages load", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of ["/", "/portfolio", "/services", "/book", "/contact", "/sessions/apply"]) {
    test(`GET ${path} returns 200`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
    });
  }
});

test.describe("Manual smoke — forms", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("contact form", async ({ page }) => {
    await page.goto("/contact");
    await waitForSpamTiming(page);
    await page.locator("#name").fill("Manual QA Contact");
    await page.locator("#email").fill("manual-qa-contact@example.com");
    await page.locator("#subject").fill("Manual smoke test");
    await page.locator("#message").fill("Contact form manual verification message.");
    await page.getByRole("button", { name: "Send Message" }).click();
    await expect(page.getByText("Message sent.")).toBeVisible({ timeout: 15_000 });
  });

  test("booking request", async ({ page }) => {
    await page.goto("/book");
    await waitForSpamTiming(page);
    await page.getByRole("button", { name: "Begin" }).click();
    await page.getByRole("button", { name: /ÉLEVÉ Signature/i }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("#feelingPrompt").fill(
      "Confident and elevated — manual QA production vision with enough detail."
    );
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("#preferredDate").fill(futureDate());
    await page.locator("#location").fill("Sacramento, CA");
    await page.getByRole("button", { name: "Outdoor", exact: true }).click();
    await page.getByRole("button", { name: "1 Hour", exact: true }).click();
    await page.getByRole("button", { name: "$300–500", exact: true }).click();
    await page.getByRole("button", { name: "Edited Photography", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("#fullName").fill("Manual QA Booking");
    await page.locator("#email").fill("manual-qa-booking@example.com");
    await page.locator("#phone").fill("5551234567");
    await page.getByRole("button", { name: "Google", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("checkbox", { name: /booking terms/i }).check();
    await page.getByRole("button", { name: /Submit inquiry/i }).click();
    await expect(page.getByText(/Welcome to ÉLEVÉ|Inquiry received/i)).toBeVisible({ timeout: 15_000 });
  });

  test("ÉLEVÉ Sessions application", async ({ page }) => {
    await page.goto("/sessions/apply");
    await waitForSpamTiming(page);
    await page.locator("#fullName").fill("Manual QA Session");
    await page.locator("#email").fill("manual-qa-session@example.com");
    await page.locator("#phone").fill("5559876543");
    await page.locator("#instagram").fill("@manualqa");
    await page.getByLabel(/18 years of age/i).check();
    await page.locator("#role").selectOption({ index: 1 });
    await page.locator("#portfolioLink").fill("https://example.com/portfolio");
    await page.locator("#experienceLevel").selectOption({ index: 1 });
    await page.locator("#whyParticipate").fill("Manual sessions application smoke test submission.");
    await page.locator("#themeFit").fill("Editorial portraiture with clean lines and natural light.");
    await page.getByLabel(/confirm availability/i).check();
    await page.getByLabel(/media release/i).check();
    await page.getByRole("button", { name: "Submit Application" }).click();
    await expect(page.getByText("Application received.")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Manual smoke — admin", () => {
  const portfolioTitle = `Manual QA ${Date.now()}`;
  const heroHeadline = `Manual Hero ${Date.now()}`;

  test("login, portfolio CRUD, hero edit, image upload", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);

    // Portfolio create
    await page.goto("/admin/portfolio");
    await page.getByRole("button", { name: "Add Project" }).click();
    await adminField(page, "Title").fill(portfolioTitle);
    await adminField(page, "Year").fill("2026");
    await adminField(page, "Description").fill("Manual smoke test portfolio item.");
    await adminField(page, "Image Alt Text").fill("Manual QA cover");
    await page.getByRole("button", { name: "Save Project" }).click();
    await expect(page.getByText(portfolioTitle)).toBeVisible({ timeout: 15_000 });

    // Portfolio edit
    await page.getByRole("button", { name: "Edit" }).first().click();
    await adminField(page, "Title").fill(`${portfolioTitle} (edited)`);
    await page.getByRole("button", { name: "Save Project" }).click();
    await expect(page.getByText(`${portfolioTitle} (edited)`)).toBeVisible({ timeout: 15_000 });

    // Image upload (1x1 PNG)
    await page.getByRole("button", { name: "Add Project" }).click();
    await adminField(page, "Title").fill(`${portfolioTitle} upload test`);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    await page.locator('input[type="file"]').last().setInputFiles({
      name: "smoke-test.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect(page.getByText("Replace")).toBeVisible({ timeout: 20_000 });

    // Homepage hero
    await page.goto("/admin/homepage");
    await adminField(page, "Headline").fill(heroHeadline);
    await page.getByRole("button", { name: /save/i }).last().click();
    await expect(page.getByText("Homepage saved.")).toBeVisible({ timeout: 10_000 });

    await page.goto("/");
    await expect(page.getByText(heroHeadline)).toBeVisible();

    // Cleanup portfolio item
    await page.goto("/admin/portfolio");
    page.once("dialog", (d) => d.accept());
    const row = page.locator(".flex.items-center.gap-4", {
      hasText: `${portfolioTitle} (edited)`,
    });
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(`${portfolioTitle} (edited)`)).not.toBeVisible();
  });
});

test.describe("Manual smoke — responsive layout", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("homepage mobile — nav and hero visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
  });

  test("homepage desktop — nav links visible", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await expect(page.getByRole("link", { name: /portfolio/i })).toBeVisible();
  });
});
