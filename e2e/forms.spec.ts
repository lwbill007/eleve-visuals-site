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
    await page.locator("#serviceType").selectOption("Photography");
    await page.locator("#shootType").selectOption("Portrait Session");
    await page.locator("#preferredDate").fill(futureDate());
    await page.locator("#location").fill("Sacramento, CA");
    await page.locator("#budgetRange").selectOption("Under $1,000");
    await page.locator("#projectDetails").fill(
      "Automated booking test with enough characters for validation."
    );
    await page.getByLabel("Edited Photos", { exact: true }).check();
    await page.getByLabel(/deposit/i).check();
    await page.getByLabel(/terms/i).check();
    await page.getByRole("button", { name: "Submit Booking Request" }).click();

    await expect(page.getByText("Booking request received.")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("sessions application submission", async ({ page }) => {
    await page.goto("/sessions/apply");
    await waitForSpamTiming(page);

    await page.locator("#fullName").fill("E2E Session Applicant");
    await page.locator("#email").fill("e2e-session@example.com");
    await page.locator("#phone").fill("5559876543");
    await page.locator("#instagram").fill("@e2eapplicant");
    await page.getByLabel(/18 years of age/i).check();
    await page.locator("#role").selectOption({ index: 1 });
    await page.locator("#portfolioLink").fill("https://example.com/portfolio");
    await page.locator("#experienceLevel").selectOption({ index: 1 });
    await page.locator("#whyParticipate").fill(
      "I want to participate because this is an automated E2E test submission."
    );
    await page.locator("#themeFit").fill(
      "My aesthetic aligns with elevated editorial portraiture and clean composition."
    );
    await page.getByLabel(/confirm availability/i).check();
    await page.getByLabel(/media release/i).check();
    await page.getByRole("button", { name: "Submit Application" }).click();

    await expect(page.getByText("Application received.")).toBeVisible({
      timeout: 15_000,
    });
  });
});
