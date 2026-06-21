import { test, expect } from "@playwright/test";

test.describe("Admin authentication", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login and logout", async ({ page }) => {
    const password =
      process.env.E2E_ADMIN_PASSWORD ??
      process.env.ADMIN_PASSWORD ??
      "e2e-admin-password-123";

    await page.goto("/admin/login");
    await page.getByLabel("Admin Password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText("Portfolio Items")).toBeVisible();

    await page.goto("/admin/login");
    await page.evaluate(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
    });
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
