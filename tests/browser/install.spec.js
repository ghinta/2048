import { test, expect } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const installButton = (page) => page.getByRole("button", { name: "App installieren", exact: true });

test("install instructions pause the game, work on small displays and restore focus", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("2048-glass-game", JSON.stringify({ version: 1, board: [2, 2, 4, 0, ...Array(12).fill(0)], score: 0, moves: 0, continued: false }));
  });
  await page.goto("./");
  await expect(installButton(page)).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem("2048-glass-game"));
  await installButton(page).click();
  await expect(page.getByRole("dialog", { name: "App installieren" })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  expect(await page.evaluate(() => localStorage.getItem("2048-glass-game"))).toBe(before);
  for (const [width, height] of [[320, 480], [390, 844], [568, 320]]) {
    await page.setViewportSize({ width, height });
    const dialog = await page.locator("#install-dialog").boundingBox();
    expect(dialog.y).toBeGreaterThanOrEqual(0);
    expect(dialog.y + dialog.height).toBeLessThanOrEqual(height);
  }
  await page.keyboard.press("Escape");
  await expect(installButton(page)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#score")).toHaveText("4");
});

for (const [name, profile, expected] of [
  ["iPhone", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Safari/605.1.15", platform: "iPhone" }, "Zum Home-Bildschirm"],
  ["Safari Mac", { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari/605.1.15", platform: "MacIntel" }, "Zum Dock hinzufügen"],
  ["Android", { userAgent: "Mozilla/5.0 (Linux; Android 15) Chrome/134.0 Safari/537.36", platform: "Linux armv8l" }, "Zum Startbildschirm hinzufügen"],
]) {
  test(`${name} gets matching install instructions`, async ({ page }) => {
    await page.addInitScript((profile) => {
      Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
      Object.defineProperty(navigator, "userAgent", { get: () => profile.userAgent });
      Object.defineProperty(navigator, "platform", { get: () => profile.platform });
    }, profile);
    await page.goto("./");
    await installButton(page).click();
    await expect(page.locator("#install-instructions")).toContainText(expected);
  });
}

test("native install is called only after a click, handles dismissal, retries and acceptance", async ({ page }) => {
  await page.goto("./");
  // OS install confirmation cannot be automated headlessly. Test the event contract.
  await page.evaluate(() => {
    window.installCalls = 0;
    window.emitInstall = (outcome) => {
      const event = new Event("beforeinstallprompt", { cancelable: true });
      event.prompt = async () => { window.installCalls++; };
      event.userChoice = Promise.resolve({ outcome });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
  });
  expect(await page.evaluate(() => window.emitInstall("dismissed"))).toBe(true);
  expect(await page.evaluate(() => window.installCalls)).toBe(0);
  await installButton(page).click();
  await expect(installButton(page)).toBeEnabled();
  expect(await page.evaluate(() => window.installCalls)).toBe(1);
  await expect(page.locator("#install-dialog")).toBeHidden();
  await installButton(page).click();
  await expect(page.locator("#install-dialog")).toBeVisible();
  expect(await page.evaluate(() => window.installCalls)).toBe(1);
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.emitInstall("accepted"));
  await installButton(page).click();
  await expect(installButton(page)).toBeHidden();
  expect(await page.evaluate(() => window.installCalls)).toBe(2);
});

test("rejected native prompt falls back to usable instructions", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = () => Promise.reject(new Error("Unavailable"));
    window.dispatchEvent(event);
  });
  await installButton(page).click();
  await expect(page.locator("#install-feedback")).toContainText("konnte nicht geöffnet werden");
  await expect(installButton(page)).toBeEnabled();
  expect(errors).toEqual([]);
});

test("standalone app windows hide the install button", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "standalone", { get: () => true, configurable: true }));
  await page.goto("./");
  await expect(installButton(page)).toBeHidden();
});

test("appinstalled closes instructions and hides the install button", async ({ page }) => {
  await page.goto("./");
  await expect(installButton(page)).toBeVisible();
  await installButton(page).click();
  await expect(page.locator("#install-dialog")).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(installButton(page)).toBeHidden();
  await expect(page.locator("#install-dialog")).toBeHidden();
});

for (const path of ["./", "./2048/"]) {
  test(`${path}: manifest, icons and worker support offline reload without losing the game`, async ({ page, context }) => {
    await page.goto(path);
    await expect(page.locator(".tile")).toHaveCount(2);
    const manifestURL = await page.locator('link[rel="manifest"]').getAttribute("href");
    const manifestResponse = await page.request.get(new URL(manifestURL, page.url()).href);
    const manifest = await manifestResponse.json();
    expect(manifest.display).toBe("standalone");
    expect(new URL(manifest.start_url, new URL(manifestURL, page.url())).pathname).toBe(new URL(page.url()).pathname);
    for (const icon of manifest.icons) {
      const response = await page.request.get(new URL(icon.src, new URL(manifestURL, page.url())).href);
      expect(response.ok()).toBe(true);
      const buffer = await response.body();
      const [width, height] = icon.sizes.split("x").map(Number);
      expect(buffer.subarray(1, 4).toString()).toBe("PNG");
      expect(buffer.readUInt32BE(16)).toBe(width);
      expect(buffer.readUInt32BE(20)).toBe(height);
    }
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
    });
    const before = await page.evaluate(() => localStorage.getItem("2048-glass-game"));
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator(".tile")).toHaveCount(2);
    expect(await page.evaluate(() => localStorage.getItem("2048-glass-game"))).toBe(before);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("#move-count")).not.toHaveText("0 Züge");
    await installButton(page).click();
    await expect(page.locator("#install-dialog")).toBeVisible();
    await context.setOffline(false);
  });
}

test("Chrome/Edge report no PWA installability errors for the GitHub Pages path", async ({ playwright, browserName, baseURL }, testInfo) => {
  test.skip(browserName !== "chromium", "CDP installability checks are specific to Chromium browsers.");
  // Playwright's default contexts are incognito, where installation is disabled.
  const profile = await mkdtemp(join(tmpdir(), "2048-installability-"));
  let context;
  try {
    context = await playwright.chromium.launchPersistentContext(profile, { headless: true, channel: testInfo.project.use.channel, ...testInfo.project.use.launchOptions });
    const page = await context.newPage();
    await page.goto(new URL("./2048/", baseURL).href);
    await page.evaluate(() => navigator.serviceWorker.ready);
    const client = await context.newCDPSession(page);
    const manifest = await client.send("Page.getAppManifest");
    expect(manifest.errors).toEqual([]);
    const result = await client.send("Page.getInstallabilityErrors");
    expect(result.installabilityErrors).toEqual([]);
  } finally {
    await context?.close();
    await rm(profile, { recursive: true, force: true });
  }
});

test("worker activation removes only obsolete caches belonging to this app scope", async ({ page, context, baseURL }) => {
  await page.goto("./2048/");
  const before = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const obsolete = `2048-shell:${registration.scope}:obsolete`;
    await caches.open(obsolete);
    const foreign = await caches.open("another-app-offline-cache");
    await foreign.put(location.href, new Response("Unrelated cached page", { headers: { "content-type": "text/html" } }));
    // Reinstallation must ignore an older foreign cache with a matching URL.
    for (const name of await caches.keys()) {
      if (name.startsWith(`2048-shell:${registration.scope}:`) && name !== obsolete) await caches.delete(name);
    }
    const game = localStorage.getItem("2048-glass-game");
    await registration.unregister();
    return { obsolete, game };
  });
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(new URL("./2048/", baseURL).href);
  await reopened.evaluate(() => navigator.serviceWorker.ready);
  expect(await reopened.evaluate((name) => caches.has(name), before.obsolete)).toBe(false);
  expect(await reopened.evaluate(() => caches.has("another-app-offline-cache"))).toBe(true);
  expect(await reopened.evaluate(() => localStorage.getItem("2048-glass-game"))).toBe(before.game);
  await context.setOffline(true);
  await reopened.reload();
  await expect(reopened.locator(".tile")).toHaveCount(2);
  await context.setOffline(false);
});
