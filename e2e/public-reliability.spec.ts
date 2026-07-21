import { expect, test } from "@playwright/test";

test.describe("Public reliability and accessibility", () => {
  test("publishes baseline security headers", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(response.headers()["content-security-policy-report-only"]).toContain(
      "default-src 'self'"
    );
    expect(response.headers()["x-powered-by"]).toBeUndefined();
  });

  test("mobile navigation is unmounted while closed and restores focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Open menu" });
    await expect(page.getByRole("dialog", { name: "Site navigation" })).toHaveCount(0);
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Site navigation" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Site navigation" })).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("shared form fields expose labels and error relationships", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByLabel("Name")).toHaveAttribute("name", "name");
    await page.getByRole("button", { name: "Send Message" }).click();
    await expect(page.getByLabel("Name")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Name")).toHaveAttribute("aria-describedby", "name-error");
  });

  test("anonymous portfolio uploads are rejected", async ({ request }) => {
    const response = await request.post("/api/submit/session/upload", {
      multipart: {
        file: {
          name: "spoof.jpg",
          mimeType: "image/jpeg",
          buffer: Buffer.from("not-an-image"),
        },
        volumeId: "unknown",
        uploadToken: "invalid",
      },
    });
    expect(response.status()).toBe(401);
  });
});
