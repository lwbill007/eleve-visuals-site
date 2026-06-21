import { test, expect, type Page } from "@playwright/test";

function adminField(page: Page, label: string) {
  return page
    .locator(".space-y-2")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("input, textarea")
    .first();
}

const projectTitle = `E2E Portfolio ${Date.now()}`;

test.describe("Admin portfolio", () => {
  test("create and delete portfolio item", async ({ page }) => {
    await page.goto("/admin/portfolio");
    await page.getByRole("button", { name: "Add Project" }).click();

    await adminField(page, "Title").fill(projectTitle);
    await adminField(page, "Year").fill("2026");
    await adminField(page, "Description").fill("Automated E2E portfolio item for QA.");
    await adminField(page, "Image Alt Text").fill("E2E test project cover");
    await page.getByRole("button", { name: "Save Project" }).click();

    await expect(page.getByText(projectTitle)).toBeVisible({ timeout: 15_000 });

    page.once("dialog", (dialog) => dialog.accept());
    const row = page.locator(".flex.items-center.gap-4", { hasText: projectTitle });
    await row.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText(projectTitle)).not.toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Admin CMS", () => {
  test("edit homepage hero headline", async ({ page }) => {
    const headline = `E2E Hero ${Date.now()}`;

    await page.goto("/admin/content");
    await page.getByRole("button", { name: "Homepage Hero" }).click();
    await adminField(page, "Headline").fill(headline);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 10_000 });

    await page.goto("/");
    await expect(page.getByText(headline)).toBeVisible();
  });
});
