import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { SignJWT } from "jose";
import { ADMIN_COOKIE_NAME } from "@/lib/auth-secret";

const authFile = path.join("playwright", ".auth", "admin.json");
const password =
  process.env.E2E_ADMIN_PASSWORD ??
  process.env.ADMIN_PASSWORD;

setup("authenticate admin", async ({ page }) => {
  const e2eSecret = process.env.E2E_AUTH_SECRET;
  if (e2eSecret) {
    if (e2eSecret.length < 32) throw new Error("E2E_AUTH_SECRET must be at least 32 characters");
    const token = await new SignJWT({
      role: "owner",
      email: "e2e@eleve",
      name: "E2E Owner",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(e2eSecret));
    const baseURL =
      process.env.PLAYWRIGHT_BASE_URL ??
      `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? "3100"}`;
    await page.context().addCookies([
      {
        name: ADMIN_COOKIE_NAME,
        value: token,
        url: baseURL,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);
    await page.context().storageState({ path: authFile });
    return;
  }

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
