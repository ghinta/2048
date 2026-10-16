import { test, expect } from "@playwright/test";

// Inject runtime signals into real engines; these are not native Tauri builds.
const profiles = [
  { os: "Windows", style: "fluent", marker: "internals", userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/134.0 Safari/537.36", platform: "Win32" },
  { os: "Linux", style: "material", marker: "current", userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15", platform: "Linux x86_64" },
  { os: "macOS", style: "liquid", marker: "internals", nativePlatform: "macos", userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/134.0 Safari/537.36 Edg/134.0", platform: "Win32" },
  { os: "iOS", style: "liquid", marker: "current", nativePlatform: "ios", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Chrome/134.0 Safari/537.36", platform: "MacIntel", maxTouchPoints: 5 },
  { os: "Android", style: "material", marker: "legacy", userAgent: "Mozilla/5.0 (Linux; Android 15; wv) Chrome/134.0 Mobile Safari/537.36", platform: "Linux armv8l", maxTouchPoints: 5 },
];

for (const profile of profiles) {
  test(`Tauri/${profile.os}: OS style before startup, manual override, reload and reset`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.addInitScript((profile) => {
      if (profile.marker === "current") window.isTauri = true;
      else if (profile.marker === "legacy") window.__TAURI_IPC__ = () => {};
      else window.__TAURI_INTERNALS__ = {};
      if (profile.nativePlatform) window.__TAURI_OS_PLUGIN_INTERNALS__ = { platform: profile.nativePlatform };
      for (const key of ["userAgent", "platform", "maxTouchPoints"]) Object.defineProperty(navigator, key, { get: () => profile[key] ?? 0 });
      Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
    }, profile);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(/\/src\/app\.js(?:\?|$)/, (route) => route.abort());
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-ui", profile.style);
    await expect(page.locator(".tile")).toHaveCount(0);
    await page.unroute(/\/src\/app\.js(?:\?|$)/);
    await page.reload();
    await expect(page.locator(".tile")).toHaveCount(2);
    await page.locator("#settings-button").click();
    await expect(page.locator("#platform-detection")).toContainText(`Tauri · ${profile.os} · Automatisch`);
    const manual = profile.style === "fluent" ? "material" : "fluent";
    await page.getByRole("combobox", { name: "UI-Stil" }).selectOption(manual);
    await expect(page.locator("html")).toHaveAttribute("data-ui", manual);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-ui", manual);
    await page.locator("#settings-button").click();
    await page.locator("#reset-appearance").click();
    await expect(page.locator("html")).toHaveAttribute("data-ui", profile.style);
    expect(errors).toEqual([]);
  });
}
