// Rasterize the existing SVG for browsers that require PNG app icons.
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const svg = await readFile("assets/icon.svg");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const page = await browser.newPage();
  for (const [file, size, maskable] of [["icon-192.png", 192, false], ["icon-512.png", 512, false], ["icon-maskable-512.png", 512, true], ["apple-touch-icon.png", 180, false]]) {
    const png = await page.evaluate(async ({ svg, size, maskable, opaque }) => {
      const image = new Image();
      image.src = `data:image/svg+xml;base64,${svg}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const context = canvas.getContext("2d");
      if (maskable || opaque) { context.fillStyle = "#b4c7f4"; context.fillRect(0, 0, size, size); }
      const padding = maskable ? size / 8 : 0;
      context.drawImage(image, padding, padding, size - padding * 2, size - padding * 2);
      return canvas.toDataURL("image/png").split(",")[1];
    }, { svg: svg.toString("base64"), size, maskable, opaque: file === "apple-touch-icon.png" });
    await writeFile(`assets/${file}`, Buffer.from(png, "base64"));
  }
} finally { await browser.close(); }
