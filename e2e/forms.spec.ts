import { test, expect } from "@playwright/test";

function futureDate(days = 30): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function waitForSpamTiming(page: import("@playwright/test").Page) {
  await page.waitForTimeout(3500);
}

test.describe("Public forms", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("contact form submission", async ({ page }) => {
    await page.goto("/contact");
    await waitForSpamTiming(page);

    await page.locator("#name").fill("E2E Contact");
    await page.locator("#email").fill("e2e-contact@example.com");
    await page.locator("#subject").fill("E2E test subject");
    await page.locator("#message").fill("This is an automated contact form test message.");
    await page.getByRole("button", { name: "Send Message" }).click();

    await expect(page.getByText("Message sent.")).toBeVisible({ timeout: 15_000 });
  });

  test("booking form submission", async ({ page }) => {
    await page.goto("/book");
    await waitForSpamTiming(page);

    await page.locator("#fullName").fill("E2E Booking User");
    await page.locator("#email").fill("e2e-booking@example.com");
    await page.locator("#phone").fill("5551234567");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Portrait", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.locator("#purpose").fill("Brand storytelling for a product launch.");
    await page.locator("#goals").fill("Create hero imagery and social assets.");
    await page.locator("#projectVision").fill(
      "Automated booking test with enough characters describing the creative vision."
    );
    await page.getByRole("button", { name: "Continue" }).click();

    // Inspiration (optional)
    await page.getByRole("button", { name: "Continue" }).click();

    await page.locator("#preferredDate").fill(futureDate());
    await page.locator("#location").fill("Sacramento, CA");
    await page.getByRole("button", { name: "Outdoor", exact: true }).click();
    await page.getByRole("button", { name: "1 Hour", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "$300–500", exact: true }).click();
    await page.getByRole("button", { name: "Edited Photography", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Google", exact: true }).click();
    await page.getByRole("checkbox", { name: /booking terms/i }).check();
    await page.getByRole("button", { name: /Start production/i }).click();

    await expect(page.getByText("Inquiry received.")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("sessions application submission", async ({ page }) => {
    await page.goto("/sessions/apply");
    await page.waitForURL(/\/sessions\/[^/]+\/apply/, { timeout: 15_000 });
    await waitForSpamTiming(page);

    await page.locator("#fullName").fill("E2E Session Applicant");
    await page.locator("#email").fill("e2e-session@example.com");
    await page.locator("#phone").fill("5559876543");
    await page.locator("#cityState").fill("Sacramento, CA");
    await page.locator("#instagram").fill("@e2eapplicant");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Model", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.locator("#portfolioLink").fill("https://example.com/portfolio");
    await page.getByRole("button", { name: "Continue" }).click();

    const textareas = page.locator("textarea");
    const count = await textareas.count();
    for (let i = 0; i < count; i++) {
      await textareas.nth(i).fill(
        "This is an automated E2E test answer with enough characters for validation."
      );
    }
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByLabel(/confirm availability/i).check();
    await page.getByLabel(/transportation/i).check();
    await page.getByLabel(/creative direction/i).check();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByLabel(/curated creative/i).check();
    await page.getByLabel(/does not guarantee/i).check();
    await page.getByLabel(/production guidelines/i).check();
    await page.getByLabel(/information provided is accurate/i).check();
    await page.getByRole("button", { name: "Submit Application" }).click();

    await expect(page.getByText(/Application Received|Application received/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
