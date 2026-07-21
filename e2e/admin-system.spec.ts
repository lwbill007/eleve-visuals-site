import { expect, test } from "@playwright/test";

test.describe("persistent admin cockpit", () => {
  test("keeps shell mounted and resolves exact query routes", async ({ page }, testInfo) => {
    await page.goto("/admin");
    const shell = page.locator("[data-admin-shell-root]");
    await expect(shell).toBeVisible();
    await shell.evaluate((node) => {
      node.setAttribute("data-e2e-persistent", "true");
    });

    const sidebar = page.locator("#admin-sidebar");
    if (testInfo.project.name === "admin-mobile") {
      await page.getByRole("button", { name: "Open menu" }).click();
    }
    const workToggle = sidebar.getByRole("button", { name: /work/i });
    if ((await workToggle.getAttribute("aria-expanded")) !== "true") await workToggle.click();
    await sidebar.getByRole("link", { name: "Pipeline", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/pipeline/);
    await expect(shell).toHaveAttribute("data-e2e-persistent", "true");
    if (testInfo.project.name === "admin-mobile") {
      await page.getByRole("button", { name: "Open menu" }).click();
    }
    await expect(sidebar.getByRole("link", { name: "Pipeline", exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );

    await page.goto("/admin/submissions?type=booking");
    if (testInfo.project.name === "admin-mobile") {
      await page.getByRole("button", { name: "Open menu" }).click();
    }
    await expect(sidebar.getByRole("link", { name: "Bookings", exact: true })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(sidebar.getByRole("link", { name: "Inbox", exact: true })).not.toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  test("command dialog traps interaction and closes with Escape", async ({ page }) => {
    await page.goto("/admin");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(async () => {
      await page.keyboard.press("Control+k");
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
    await expect(dialog.getByPlaceholder(/revenue/i)).toBeFocused();
    await expect(page.locator("[data-admin-shell-root]")).toHaveAttribute("inert", "");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.locator("[data-admin-shell-root]")).not.toHaveAttribute("inert", "");
  });

  test("mobile navigation traps focus and restores the menu button", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "admin-mobile", "Mobile-only behavior");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/admin");
    const openMenu = page.getByRole("button", { name: "Open menu" });
    await openMenu.click();
    const sidebar = page.locator("#admin-sidebar");
    await expect(sidebar).toHaveAttribute("aria-hidden", "false");

    await page.keyboard.press("Escape");
    await expect(sidebar).toHaveAttribute("aria-hidden", "true");
    await expect(openMenu).toBeFocused();
  });

  test("long editor exposes labels and warns about unsaved changes", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "admin-chromium", "Desktop editor coverage");
    await page.route("**/api/admin/content", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/admin/session-volumes", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/admin/portfolio", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/admin/testimonials", (route) => route.fulfill({ json: [] }));
    await page.goto("/admin/homepage", { waitUntil: "domcontentloaded" });
    const headline = page.getByLabel("Headline", { exact: true }).first();
    await expect(headline).toBeVisible();
    await expect
      .poll(() =>
        headline.evaluate((element) =>
          Object.keys(element).some((key) => key.startsWith("__reactProps$"))
        )
      )
      .toBe(true);
    await headline.fill("Unsaved E2E headline");
    await expect(headline).toHaveValue("Unsaved E2E headline");

    const dialogPromise = page.waitForEvent("dialog");
    const reloadPromise = page
      .reload({ waitUntil: "commit", timeout: 5_000 })
      .catch(() => null);
    const dialog = await dialogPromise;
    expect(dialog.type()).toBe("beforeunload");
    await dialog.dismiss();
    await reloadPromise;
  });

  test("shell remains readable at 200 percent zoom", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "admin-chromium", "Desktop zoom coverage");
    await page.goto("/admin");
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    await expect(page.getByRole("heading", { name: "Home", exact: true }).first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
