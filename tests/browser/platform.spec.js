import { test, expect } from "@playwright/test";

const profiles = [
  { browser: "Chrome", os: "Android", style: "material", userAgent: "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/134.0.0.0 Mobile Safari/537.36", platform: "Linux armv8l", maxTouchPoints: 5 },
  { browser: "Edge", os: "Windows", style: "fluent", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0", platform: "Win32", maxTouchPoints: 0 },
  { browser: "Safari", os: "iOS", style: "liquid", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1", platform: "iPhone", maxTouchPoints: 5 },
];

test("installed browser selects its style using unmodified identity signals", async ({ page, browser }, testInfo) => {
  await page.goto("./");
  const expected = testInfo.project.name === "webkit" ? { browser: "Safari", style: "liquid" }
    : testInfo.project.name === "msedge" ? { browser: "Edge", style: "fluent" } : { browser: "Chrome", style: "material" };
  await expect(page.locator("html")).toHaveAttribute("data-ui", expected.style);
  await expect(page.locator(".tile")).toHaveCount(2);
  await page.getByRole("button", { name: "Darstellung öffnen" }).click();
  await expect(page.getByRole("combobox", { name: "UI-Stil" })).toHaveValue("auto");
  await expect(page.locator("#platform-detection")).toContainText(`${expected.browser} ·`);
  const identity = await page.evaluate(() => ({ userAgent: navigator.userAgent, brands: navigator.userAgentData?.brands, detected: PlatformUI.initial.detected }));
  expect(identity.detected.browser).toBe(expected.browser);
  await testInfo.attach("browser-identity", { body: JSON.stringify({ project: testInfo.project.name, version: browser.version(), ...identity }, null, 2), contentType: "application/json" });
});

for (const profile of profiles) {
  test(`${profile.browser}/${profile.os}: appearance is ready before the game module loads`, async ({ page }) => {
    await page.addInitScript((profile) => {
      for (const key of ["userAgent", "platform", "maxTouchPoints"]) Object.defineProperty(navigator, key, { get: () => profile[key] });
      Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
      if (!localStorage.getItem("2048-ui-style")) localStorage.setItem("2048-ui-style", "auto");
      localStorage.setItem("2048-glass-theme", "dark");
      localStorage.setItem("2048-glass-appearance", JSON.stringify({ version: 1, glassLevel: 81.6, fillScreen: false, reduceTransparency: true }));
    }, profile);
    // No game code may help initialize the appearance in this test.
    await page.route(/\/src\/app\.js(?:\?|$)/, (route) => route.abort());
    await page.goto("./");
    for (const style of [profile.style, profile.style === "fluent" ? "material" : "fluent"]) {
      await expect(page.locator("html")).toHaveAttribute("data-ui", style);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(page.locator("html")).toHaveAttribute("data-layout", "square");
      await expect(page.locator("html")).toHaveAttribute("data-reduce-transparency", "true");
      const appearance = await page.evaluate(() => ({ glass: getComputedStyle(document.documentElement).getPropertyValue("--glass-level"), meta: document.querySelector('meta[name="theme-color"]').content, page: getComputedStyle(document.documentElement).getPropertyValue("--page").trim() }));
      expect(Number(appearance.glass)).toBe(.82);
      expect(appearance.meta).toBe(appearance.page);
      await expect(page.locator(".tile")).toHaveCount(0);
      await page.evaluate((next) => localStorage.setItem("2048-ui-style", next), profile.style === "fluent" ? "material" : "fluent");
      if (style === profile.style) await page.reload();
    }
  });

  test(`${profile.browser}/${profile.os}: automatic UI, manual override, reload and reset`, async ({ page }) => {
    test.setTimeout(60_000); // Three skins and both themes include several native UI interactions.
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
  test(`${style}: touch input and keyboard settings work with reduced motion`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce", colorScheme: "dark" });
    const page = await context.newPage();
    await page.addInitScript((style) => {
      localStorage.setItem("2048-ui-style", style);
      localStorage.setItem("2048-glass-game", JSON.stringify({ version: 1, board: [2, 2, 4, 0, ...Array(12).fill(0)], score: 0, moves: 0, continued: false }));
    }, style);
    await page.goto(baseURL);
    await page.locator("#board").waitFor();
    // Pointer Events are the shared swipe API in Safari, Chrome and Edge.
    await page.locator("#board").evaluate((board) => {
      const bounds = board.getBoundingClientRect();
      const dispatch = (type, x) => board.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: "touch", isPrimary: true, clientX: x, clientY: bounds.y + bounds.height / 2 }));
      // Synthetic pointers cannot acquire real capture; exercise the handler normally afterwards.
      const capture = board.setPointerCapture;
      board.setPointerCapture = () => {};
      try { dispatch("pointerdown", bounds.right - 24); dispatch("pointerup", bounds.left + 24); }
      finally { board.setPointerCapture = capture; }
    });
    await expect(page.locator("#score")).toHaveText("4");
    await page.getByRole("button", { name: "Darstellung öffnen" }).tap();
    await page.getByRole("combobox", { name: "UI-Stil" }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("radio", { name: "System", exact: true })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Hell", exact: true })).toBeChecked();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("switch", { name: "Bildschirm ausfüllen" }).focus();
    await page.keyboard.press("Space");
    await expect(page.locator("html")).toHaveAttribute("data-layout", "square");
    await page.keyboard.press("Escape");
    await expect(page.locator("#settings-button")).toBeFocused();
    await context.close();
  });

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

test("blocked storage follows system dark mode before and after game initialization", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
  });
  await page.route(/\/src\/app\.js(?:\?|$)/, (route) => route.abort());
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.unroute(/\/src\/app\.js(?:\?|$)/);
  await page.reload();
  await expect(page.locator(".tile")).toHaveCount(2);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("Windows high contrast preserves keyboard access and game input", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Forced-colors emulation is available in Chromium.");
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("2048-ui-style", "fluent");
    localStorage.setItem("2048-glass-game", JSON.stringify({ version: 1, board: [2, 2, 4, 0, ...Array(12).fill(0)], score: 0, moves: 0, continued: false }));
  });
  await page.goto("./");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#score")).toHaveText("4");
  await page.locator("#settings-button").click();
  const toggle = page.getByRole("switch", { name: "Bildschirm ausfüllen" });
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).not.toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-layout", "square");
  await expect(toggle).toHaveCSS("outline-style", "solid");
});
