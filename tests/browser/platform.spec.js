import { test, expect } from "@playwright/test";

const profiles = [
  { browser: "Chrome", os: "Android", style: "material", userAgent: "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/134.0.0.0 Mobile Safari/537.36", platform: "Linux armv8l", maxTouchPoints: 5 },
  { browser: "Edge", os: "Windows", style: "fluent", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0", platform: "Win32", maxTouchPoints: 0 },
  { browser: "Safari", os: "iOS", style: "liquid", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1", platform: "iPhone", maxTouchPoints: 5 },
];

for (const profile of profiles) {
  test(`${profile.browser}/${profile.os}: automatic UI, manual override, reload and reset`, async ({ page }) => {
    // Emulate identity signals, not a different browser engine.
    await page.addInitScript((profile) => {
      for (const key of ["userAgent", "platform", "maxTouchPoints"]) Object.defineProperty(navigator, key, { get: () => profile[key] });
      Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
      if (!localStorage.getItem("2048-glass-game")) localStorage.setItem("2048-glass-game", JSON.stringify({ version: 1, board: [2, 2, 4, 0, ...Array(12).fill(0)], score: 0, moves: 0, continued: false }));
    }, profile);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-ui", profile.style);
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#move-count")).toHaveText("1 Zug");
    const before = await page.evaluate(() => localStorage.getItem("2048-glass-game"));
    await page.locator("#settings-button").click();
    const select = page.getByRole("combobox", { name: "UI-Stil" });
    await expect(select).toHaveValue("auto");
    await expect(page.locator("#platform-detection")).toContainText(`${profile.browser} · ${profile.os} · Automatisch`);
    for (const style of ["liquid", "material", "fluent"]) {
      await select.selectOption(style);
      await expect(page.locator("html")).toHaveAttribute("data-ui", style);
      await expect(page.locator("#glass-settings")).toBeVisible({ visible: style === "liquid" });
      await expect(page.locator("#transparency-setting")).toBeVisible({ visible: style !== "material" });
      for (const scheme of ["light", "dark"]) {
        await page.getByRole("radio", { name: scheme === "light" ? "Hell" : "Dunkel", exact: true }).check();
        const colors = await page.evaluate(() => ({ meta: document.querySelector('meta[name="theme-color"]').content, page: getComputedStyle(document.documentElement).getPropertyValue("--page").trim() }));
        expect(colors.meta).toBe(colors.page);
      }
    }
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-ui", "fluent");
    await page.locator("#settings-button").click();
    await expect(select).toHaveValue("fluent");
    await page.locator("#reset-appearance").click();
    await expect(select).toHaveValue("auto");
    await expect(page.locator("html")).toHaveAttribute("data-ui", profile.style);
    expect(await page.evaluate(() => localStorage.getItem("2048-glass-game"))).toBe(before);
    expect(errors).toEqual([]);
  });
}

for (const style of ["material", "fluent"]) {
  test(`${style}: game input, tile values and viewport fit in both themes`, async ({ page }) => {
    await page.addInitScript((style) => {
      localStorage.setItem("2048-ui-style", style);
      if (!localStorage.getItem("2048-glass-game")) localStorage.setItem("2048-glass-game", JSON.stringify({ version: 1, board: [2, 2, 4, 0, ...Array(12).fill(0)], score: 0, moves: 0, continued: false }));
      Math.random = () => 0;
    }, style);
    await page.goto("./");
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#score")).toHaveText("4");
    await page.locator("#undo-button").click();
    await expect(page.locator("#score")).toHaveText("0");
    // Populate the board without resetting the style or save on every navigation.
    await page.evaluate(() => localStorage.setItem("2048-glass-game", JSON.stringify({ version: 1, board: [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536], score: 4096, moves: 100, continued: true })));
    await page.reload();
    await expect(page.locator(".tile")).toHaveCount(16);
    for (const scheme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const [width, height] of [[1440, 1000], [320, 480], [390, 844], [768, 1024], [844, 390], [568, 320]]) {
        await page.setViewportSize({ width, height });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
        const board = await page.locator("#board").boundingBox();
        expect(board.width).toBeGreaterThanOrEqual(200);
        expect(board.height).toBeGreaterThanOrEqual(200);
        const controls = await page.locator(".game-controls").boundingBox();
        expect(controls.y + controls.height).toBeLessThanOrEqual(height);
        expect(await page.locator(".tile-face").evaluateAll((tiles) => tiles.every((tile) => tile.scrollWidth <= tile.clientWidth))).toBe(true);
      }
      await page.locator("#settings-button").click();
      const dialog = await page.locator("#settings-dialog").boundingBox();
      expect(dialog.y).toBeGreaterThanOrEqual(0);
      expect(dialog.y + dialog.height).toBeLessThanOrEqual(320);
      await page.keyboard.press("Escape");
    }
  });
}

test("automatic UI and manual switching still work with blocked storage", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
  });
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-ui", /liquid|material|fluent/);
  await page.locator("#settings-button").click();
  await page.getByRole("combobox", { name: "UI-Stil" }).selectOption("fluent");
  await expect(page.locator("html")).toHaveAttribute("data-ui", "fluent");
});

test("invalid saved UI preference falls back to automatic detection", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("2048-ui-style", "invalid"));
  await page.goto("./");
  await page.locator("#settings-button").click();
  await expect(page.getByRole("combobox", { name: "UI-Stil" })).toHaveValue("auto");
  await expect(page.locator("#platform-detection")).toContainText("Automatisch");
});
