import { test, expect } from "@playwright/test";

test("home-screen icons are explicit, versioned PNGs with the correct dimensions", async ({ page }) => {
  await page.goto("./");
  const apple = page.locator('link[rel="apple-touch-icon"]');
  await expect(apple).toHaveAttribute("sizes", "180x180");
  const appleURL = new URL(await apple.getAttribute("href"), page.url());
  expect(appleURL.searchParams.get("v")).toMatch(/^[a-f0-9]{12}$/);
  const manifestURL = new URL(await page.locator('link[rel="manifest"]').getAttribute("href"), page.url());
  const manifest = await (await page.request.get(manifestURL.href)).json();
  expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  for (const icon of [{ src: appleURL.href, sizes: "180x180" }, ...manifest.icons]) {
    const url = new URL(icon.src, manifestURL);
    expect(url.origin).toBe(new URL(page.url()).origin);
    expect(url.searchParams.get("v")).toBe(appleURL.searchParams.get("v"));
    const response = await page.request.get(url.href);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
    const buffer = await response.body();
    expect(buffer.subarray(1, 4).toString()).toBe("PNG");
    expect(`${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`).toBe(icon.sizes);
  }
  for (const icon of manifest.icons) {
    expect(new URL(icon.src, "https://example.test/2048/manifest.webmanifest").pathname).toMatch(/^\/2048\/assets\//);
  }
  expect((await page.request.get(new URL("./assets/icon-source.png", page.url()).href)).status()).toBe(404);
});

test("Apple and maskable icons have opaque edges and the header uses the new artwork", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator(".brand img")).toHaveAttribute("src", /icon-192\.png\?v=/);
  const paths = await page.evaluate(async () => {
    const manifestURL = document.querySelector('link[rel="manifest"]').href;
    const manifest = await (await fetch(manifestURL)).json();
    return [document.querySelector('link[rel="apple-touch-icon"]').href, new URL(manifest.icons.find((icon) => icon.purpose === "maskable").src, manifestURL).href];
  });
  for (const path of paths) {
    expect(await page.evaluate(async (path) => {
      const image = new Image();
      image.src = path;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = image.naturalWidth;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return [[0, 0], [canvas.width - 1, 0], [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1]].map(([x, y]) => context.getImageData(x, y, 1, 1).data[3]);
    }, path)).toEqual([255, 255, 255, 255]);
  }
});
