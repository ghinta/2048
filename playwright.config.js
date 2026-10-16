import { defineConfig } from "@playwright/test";

const engines = (process.env.PLAYWRIGHT_ENGINES || "chromium").split(",");

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4174",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  projects: [
    ...(engines.includes("chromium") ? [{ name: "chromium", use: { browserName: "chromium", launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {} } }] : []),
    // Platform tests use engine-independent APIs; touch/CDP game tests stay on Chromium.
    ...(engines.includes("webkit") ? [{ name: "webkit", testMatch: /platform\.spec\.js/, use: { browserName: "webkit" } }] : []),
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "python3 -m http.server 4174 --bind 127.0.0.1 --directory dist",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "ignore",
  },
});
