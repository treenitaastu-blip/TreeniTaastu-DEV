import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";

const e2eEnv = loadEnv("e2e", process.cwd(), "");

for (const [key, value] of Object.entries(e2eEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const STAGING_PROJECT_REF = "hidyllpyecockzhqfpft";
const PRODUCTION_PROJECT_REF = "dtxbrnrpzepwoxooqwlj";
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "E2E katkestati: lisa .env.e2e.local faili stagingu VITE_SUPABASE_URL ja VITE_SUPABASE_ANON_KEY.",
  );
}

if (
  supabaseUrl.includes(PRODUCTION_PROJECT_REF) ||
  !supabaseUrl.includes(STAGING_PROJECT_REF)
) {
  throw new Error(
    `E2E katkestati: testid tohivad kasutada ainult Supabase stagingu projekti ${STAGING_PROJECT_REF}.`,
  );
}

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";
const usesLocalServer = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(
  baseURL,
);
const localChromeChannel =
  process.env.CI || process.env.PLAYWRIGHT_USE_BUNDLED_CHROMIUM
    ? undefined
    : "chrome";
const isolatedMacLaunchArgs = process.env.PLAYWRIGHT_USE_BUNDLED_CHROMIUM
  ? ["--single-process", "--no-zygote"]
  : undefined;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL,
    locale: "et-EE",
    timezoneId: "Europe/Tallinn",
    launchOptions: { args: isolatedMacLaunchArgs },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: usesLocalServer
    ? {
        command:
          "npm run build -- --mode e2e && npm run preview -- --host 127.0.0.1 --port 4173",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          VITE_SUPABASE_URL: supabaseUrl,
          VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
        },
      }
    : undefined,
  projects: [
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: localChromeChannel,
      },
    },
    {
      name: "mobile-chrome",
      grepInvert: /@desktop-only/,
      use: {
        ...devices["Pixel 7"],
        channel: localChromeChannel,
      },
    },
  ],
});
