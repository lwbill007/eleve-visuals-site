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

    // Service
    await page.getByRole("radio", { name: /Portrait/i }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Budget & timing
    await page.getByRole("radiogroup", { name: "Budget" }).getByRole("radio").first().click();
    await page.locator("#preferredDate").fill(futureDate());
    await page.getByRole("button", { name: "Continue" }).click();

    // Optional vision
    await page.locator("#feelingPrompt").fill(
      "Confident, elevated, and intentional — work that feels premium."
    );
    await page.getByRole("button", { name: "Continue" }).click();

    // Contact
    await page.locator("#fullName").fill("E2E Booking User");
    await page.locator("#email").fill("e2e-booking@example.com");
    await page.locator("#phone").fill("5551234567");
    await page.getByRole("checkbox", { name: /booking terms/i }).check();
    await page.getByRole("button", { name: /Submit inquiry/i }).click();

    await expect(page.getByText(/Welcome to ÉLEVÉ|Inquiry received/i)).toBeVisible({
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
