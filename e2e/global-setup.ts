import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const authFile = path.join("playwright", ".auth", "admin.json");
const password =
  process.env.E2E_ADMIN_PASSWORD ??
  process.env.ADMIN_PASSWORD;

setup("authenticate admin", async ({ page }) => {
  if (!password) {
    throw new Error("E2E_ADMIN_PASSWORD or ADMIN_PASSWORD is required for admin E2E tests");
  }
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto("/admin/login");
  await page.getByLabel("Admin Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.context().storageState({ path: authFile });
});
