import { test, expect } from "@playwright/test";

const row = (values) => [...values, ...Array(12).fill(0)];
const initial = { version: 1, board: row([2, 2, 4, 0]), score: 0, moves: 0, continued: false };
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("2048-glass-game")));

async function openGame(page, state = initial) {
  await page.addInitScript((game) => {
    localStorage.setItem("2048-glass-game", JSON.stringify(game));
    localStorage.removeItem("2048-glass-best");
    localStorage.setItem("2048-glass-theme", "light");
    Math.random = () => 0;
  }, state);
  await page.goto("./");
  await expect(page.locator(".tile")).toHaveCount(state.board.filter(Boolean).length);
}

test("keyboard merges once, awards points, spawns a tile and supports undo", async ({ page }) => {
  await openGame(page);
  await expect(page.getByRole("button", { name: "Zurück", exact: true })).toBeDisabled();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#score")).toHaveText("4");
  expect((await saved(page)).board).toEqual(row([4, 4, 2, 0]));
  await expect(page.locator("#move-count")).toHaveText("1 Zug");
  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  expect((await saved(page)).board).toEqual(initial.board);
  await expect(page.locator("#score")).toHaveText("0");
  await expect(page.locator("#best")).toHaveText("4");
  await expect(page.locator("#undo-button")).toBeDisabled();
});

test("an ineffective move does not spawn or count; WASD works", async ({ page }) => {
  await openGame(page, { ...initial, board: row([2, 4, 8, 16]) });
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#move-count")).toHaveText("0 Züge");
  await expect(page.locator(".tile")).toHaveCount(4);
  await page.keyboard.press("s");
  await expect(page.locator("#move-count")).toHaveText("1 Zug");
  expect((await saved(page)).board.slice(12)).toEqual([2, 4, 8, 16]);
  await page.keyboard.press("z");
  await expect(page.locator("#move-count")).toHaveText("0 Züge");
});

test("game, best score and appearance survive a real page reload", async ({ browser, baseURL }) => {
  const page = await browser.newPage();
  await page.goto(baseURL);
  await page.evaluate((state) => {
    localStorage.setItem("2048-glass-game", JSON.stringify(state));
    localStorage.setItem("2048-glass-theme", "light");
    localStorage.removeItem("2048-glass-best");
  }, initial);
  await page.reload();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#score")).toHaveText("4");
  const before = await saved(page);
  await page.getByRole("button", { name: "Dunkle Darstellung aktivieren" }).click();
  await page.reload();
  expect(await saved(page)).toEqual(before);
  await expect(page.locator("#score")).toHaveText("4");
  await expect(page.locator("#best")).toHaveText("4");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.close();
});

test("restart confirmation can be cancelled and preserves the best score", async ({ page }) => {
  await openGame(page);
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#score")).toHaveText("4");
  await page.getByRole("button", { name: "Neues Spiel", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Neue Runde?" })).toBeVisible();
  await page.getByRole("button", { name: "Weiterspielen", exact: true }).click();
  await expect(page.locator("#score")).toHaveText("4");
  await page.getByRole("button", { name: "Neues Spiel", exact: true }).click();
  await page.getByRole("button", { name: "Neu starten", exact: true }).click();
  await expect(page.locator("#score")).toHaveText("0");
  await expect(page.locator("#best")).toHaveText("4");
  await expect(page.locator(".tile")).toHaveCount(2);
  await expect(page.locator("#move-count")).toHaveText("0 Züge");
});

test("winning at 2048 opens the win state and continuing resumes play", async ({ page }) => {
  await openGame(page, { ...initial, board: row([1024, 1024, 0, 0]) });
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("heading", { name: "Das ist deine 2048." })).toBeVisible();
  await expect(page.locator("#score")).toHaveText("2.048");
  await page.getByRole("button", { name: "Weiterspielen", exact: true }).click();
  await expect(page.locator("#game-overlay")).toBeHidden();
  expect((await saved(page)).continued).toBe(true);
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#move-count")).toHaveText("2 Züge");
  await expect(page.locator("#game-overlay")).toBeHidden();
});

test("a blocked board shows game over; undo returns to the playable position", async ({ page }) => {
  const board = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 0, 4, 8, 16];
  await openGame(page, { ...initial, board, moves: 12, score: 180 });
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("heading", { name: "Ein guter Lauf." })).toBeVisible();
  await page.getByRole("button", { name: "Letzten Zug zurück", exact: true }).click();
  await expect(page.locator("#game-overlay")).toBeHidden();
  expect((await saved(page)).board).toEqual(board);
  await expect(page.locator("#move-count")).toHaveText("12 Züge");
});

test("help is keyboard accessible and pauses game input", async ({ page }) => {
  await openGame(page);
  await page.getByRole("button", { name: "So geht’s" }).click();
  await expect(page.getByRole("dialog", { name: "Ein Zug nach dem anderen." })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  expect((await saved(page)).board).toEqual(initial.board);
  await page.keyboard.press("Escape");
  await expect(page.locator("#help-dialog")).toBeHidden();
  await expect(page.locator("#help-button")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#score")).toHaveText("4");
});

test("mobile touch swipes work and the layout fits narrow screens", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await openGame(page);
  const board = await page.locator("#board").boundingBox();
  const session = await context.newCDPSession(page);
  const y = Math.round(board.y + board.height / 2);
  const right = Math.round(board.x + board.width - 20);
  const left = Math.round(board.x + 20);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: right, y }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: left, y }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator("#score")).toHaveText("4");
  for (const width of [320, 375, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await page.locator("#board").boundingBox();
    expect(Math.abs(bounds.width - bounds.height)).toBeLessThan(1);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
  }
  await context.close();
});

test("reduced motion still completes moves and updates the accessible grid", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openGame(page);
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#score")).toHaveText("4");
  await expect(page.getByRole("gridcell")).toHaveCount(16);
  await expect(page.getByRole("gridcell").first()).toHaveAttribute("aria-label", "Zeile 1, Spalte 1: 4");
  await expect(page.locator("#game-announcement")).toContainText("4 Punkte dazu");
});

test("unavailable storage does not prevent a game from starting", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
  });
  await page.goto("./");
  await expect(page.locator(".tile")).toHaveCount(2);
  await expect(page.getByRole("status").filter({ hasText: "Dein Browser erlaubt kein Speichern" })).toBeVisible();
  for (const key of ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(160);
  }
  await expect(page.locator("#move-count")).not.toHaveText("0 Züge");
  expect(errors).toEqual([]);
});

test("invalid saved data is safely replaced with a new game", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("2048-glass-game", '{"version":1,"board":[3],"score":-1}'); });
  await page.goto("./");
  await expect(page.locator(".tile")).toHaveCount(2);
  await expect(page.locator("#score")).toHaveText("0");
  expect((await saved(page)).board).toHaveLength(16);
});

test("desktop glass surfaces and every tile value render without overflow", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const board = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536];
  await openGame(page, { ...initial, board, continued: true });
  await expect(page.locator(".tile")).toHaveCount(16);
  await expect(page.locator(".game-card")).toHaveCSS("backdrop-filter", /blur/);
  for (const width of [1440, 1024, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator("#theme-button").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});
