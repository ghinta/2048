// Export the opaque icon master at platform-required sizes, including mask-safe padding.
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const source = await readFile("assets/icon-source.png");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const page = await browser.newPage();
  for (const [file, size] of [["favicon-32.png", 32], ["icon-192.png", 192], ["icon-512.png", 512], ["icon-maskable-512.png", 512], ["apple-touch-icon.png", 180]]) {
    const png = await page.evaluate(async ({ source, size }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${source}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, size, size);
      return canvas.toDataURL("image/png").split(",")[1];
    }, { source: source.toString("base64"), size });
    await writeFile(`assets/${file}`, Buffer.from(png, "base64"));
  }
} finally { await browser.close(); }
