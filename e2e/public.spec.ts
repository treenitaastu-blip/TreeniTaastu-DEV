import { expect, test } from "@playwright/test";

test.describe("Avalikud põhivood", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("lander avaneb ja peamine pakkumine on nähtav", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Treenitaastu/i);
    await expect(
      page.getByRole("heading", { name: /muuda oma elu.*20 päevaga/i }),
    ).toBeVisible();
    await expect(page.locator('a[href="/login"]:visible').first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Alusta tasuta proovi" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Tasuta proov", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Proovi staatilisi ja PT treeningkavasid tasuta 7 päeva"),
    ).toBeVisible();
  });

  test("sisselogimise ja konto loomise vaated on omavahel ühendatud", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Tere tulemast tagasi" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Loo konto" }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { name: "Loo konto" })).toBeVisible();

    await page.getByRole("link", { name: "Logi sisse" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("konto loomine kontrollib nõrka parooli enne API päringut", async ({
    page,
  }) => {
    await page.goto("/signup");
    await page.getByLabel("E-post").fill("e2e-validation@example.com");
    await page.getByLabel("Parool", { exact: true }).fill("nõrk");
    await page
      .getByRole("button", { name: "Alusta 7-päevast tasuta proovi" })
      .click();

    await expect(
      page.getByText("Parool peab olema vähemalt 8 tähemärki"),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("parooli nähtavust saab sisse ja välja lülitada", async ({ page }) => {
    await page.goto("/login");
    const password = page.getByLabel("Parool", { exact: true });

    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Näita parooli" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Peida parool" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("parooli taastamise vaadet saab avada ilma päringut saatmata", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Unustasid parooli?" }).click();

    await expect(
      page.getByRole("heading", { name: "Taasta parool" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Saada taastamislink" }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Tagasi sisselogimise juurde" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Tere tulemast tagasi" }),
    ).toBeVisible();
  });

  test("parooli muutmise leht ei aktsepteeri tavalist sessiooni taastamistõendina", async ({
    page,
  }) => {
    await page.goto("/reset-password");

    await expect(
      page.getByRole("heading", { name: "Taastamislink ei kehti" }),
    ).toBeVisible();
    await expect(page.getByLabel("Uus parool")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Küsi uus link" })).toBeVisible();
  });

  test("vana admini seadistusleht ei ole enam avalik", async ({ page }) => {
    await page.goto("/admin-setup");

    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tee mind administraatoriks" }),
    ).toHaveCount(0);
  });

  test("kaitstud lehed suunavad anonüümse kasutaja sisselogimisse", async ({
    page,
  }) => {
    for (const path of ["/home", "/admin", "/programs", "/kalkulaatorid/kmi"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByRole("heading", { name: "Tere tulemast tagasi" }),
      ).toBeVisible();
    }
  });

  test("hinnad ja juriidilised lehed avanevad", async ({ page }) => {
    await page.goto("/pricing");
    await expect(
      page.getByRole("heading", { name: "Vali oma treeningplaan" }),
    ).toBeVisible();

    await page.goto("/privacy-policy");
    await expect(page.getByRole("main")).toContainText(/privaatsus/i);

    await page.goto("/terms-of-service");
    await expect(page.getByRole("main")).toContainText(/tingim/i);
  });

  test("tundmatu aadress näitab 404 lehte", async ({ page }) => {
    await page.goto("/seda-lehte-ei-ole");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByText("Oops! Page not found")).toBeVisible();
  });
});
