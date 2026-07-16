import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe("Admin programmi koostaja", () => {
  test.skip(
    !adminEmail || !adminPassword,
    "Lisa stagingu admini E2E_ADMIN_EMAIL ja E2E_ADMIN_PASSWORD faili .env.e2e.local.",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-post").fill(adminEmail!);
    await page.getByLabel("Parool", { exact: true }).fill(adminPassword!);
    await page.getByRole("button", { name: "Logi sisse", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.goto("/admin/programs");
    await expect(
      page.getByRole("heading", { name: "Personaaltreeningu Haldus" }),
    ).toBeVisible();
  });

  test("pooleliolev mustand taastub pärast refresh'i", async ({ page }) => {
    await page.getByRole("button", { name: "Program", exact: true }).click();
    await expect(page.getByTestId("program-step-settings")).toBeVisible();

    await page.getByLabel("Klient", { exact: true }).selectOption({
      label: adminEmail!,
    });
    await page.getByLabel("Programmi nimi").fill("E2E taastuv mustand");
    await page.getByRole("button", { name: "Jätka", exact: true }).click();

    await page.getByRole("button", { name: "Lisa harjutus", exact: true }).click();
    await page.getByLabel("Harjutus", { exact: true }).fill("Goblet-kükk");
    await expect(page.getByText("Mustand salvestatud", { exact: true })).toBeVisible();

    page.once("dialog", async (dialog) => dialog.accept());
    await page.reload();

    await expect(page.getByTestId("program-creator")).toBeVisible();
    await expect(page.getByTestId("program-step-days")).toBeVisible();
    await expect(page.getByLabel("Harjutus", { exact: true })).toHaveValue(
      "Goblet-kükk",
    );
  });

  test("koostaja mahub ekraanile ilma horisontaalse ülevooluta", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Program", exact: true }).click();
    const creator = page.getByTestId("program-creator");
    await expect(creator).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Loo kliendile programm" }),
    ).toBeVisible();

    const viewport = page.viewportSize();
    const box = await creator.boundingBox();
    expect(viewport).not.toBeNull();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.width).toBeLessThanOrEqual(viewport!.width + 1);

    const hasHorizontalOverflow = await creator.evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
