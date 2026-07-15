import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe("Autenditud kliendi põhivood @desktop-only", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !email || !password,
      "Lisa stagingu testkasutaja E2E_USER_EMAIL ja E2E_USER_PASSWORD faili .env.e2e.local.",
    );

    await page.goto("/login");
    await page.getByLabel("E-post").fill(email!);
    await page.getByLabel("Parool", { exact: true }).fill(password!);
    await page.getByRole("button", { name: "Logi sisse", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByText("Personaaltreening", { exact: true })).toBeVisible();
  });

  test("kasutaja jõuab pärast sisselogimist avalehele", async ({ page }) => {
    await expect(page.getByText(/täna on hea päev/i)).toBeVisible();
    await expect(page.getByText("Programmid", { exact: true })).toBeVisible();
  });

  test("tavakasutaja ei pääse admini", async ({ page }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/not-authorized$/);
    await expect(
      page.getByRole("heading", { name: "Access Denied" }),
    ).toBeVisible();
  });

  test("tavaline sisselogitud sessioon ei anna parooli taastamise õigust", async ({
    page,
  }) => {
    await page.goto("/reset-password");

    await expect(
      page.getByRole("heading", { name: "Taastamislink ei kehti" }),
    ).toBeVisible();
    await expect(page.getByLabel("Uus parool")).toHaveCount(0);
  });

  test("tellimuseta kasutaja ei pääse staatilise programmi tööriistadesse", async ({
    page,
  }) => {
    await page.goto("/kalkulaatorid/kmi");

    await expect(page).toHaveURL(/\/pricing$/);
    await expect(
      page.getByRole("heading", { name: "Vali oma treeningplaan" }),
    ).toBeVisible();
  });

  test("tellimuseta kasutaja ei pääse PT programmidesse", async ({ page }) => {
    await page.goto("/programs");

    await expect(page).toHaveURL(/\/pricing$/);
    await expect(
      page.getByRole("heading", { name: "Vali oma treeningplaan" }),
    ).toBeVisible();
  });

  test("kasutaja saab välja logida", async ({ page }) => {
    await page
      .locator('button[aria-haspopup="menu"]')
      .filter({ hasText: email! })
      .click();
    await page.getByRole("button", { name: "Logi välja" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Logi sisse" }),
    ).toBeVisible();
  });
});
