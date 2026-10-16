import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const path of ["index.html", "styles.css", "platform.css", "src", "assets", ".nojekyll"]) {
  await cp(path, `dist/${path}`, { recursive: true });
}

// Keep a deployment's HTML, styles and modules together in browser caches.
const contents = await Promise.all(["index.html", "styles.css", "src/app.js", "src/game.js", "platform.css", "src/platform.js"].map((path) => readFile(`dist/${path}`, "utf8")));
const version = createHash("sha256").update(contents.join("\0")).digest("hex").slice(0, 12);
const html = contents[0]
  .replace('href="./styles.css"', `href="./styles.css?v=${version}"`)
  .replace('href="./platform.css"', `href="./platform.css?v=${version}"`)
  .replace('src="./src/app.js"', `src="./src/app.js?v=${version}"`);
const app = contents[2].replace('"./game.js"', `"./game.js?v=${version}"`).replace('"./platform.js"', `"./platform.js?v=${version}"`);
await Promise.all([
  writeFile("dist/index.html", html),
  writeFile("dist/src/app.js", app),
]);
console.log("Static site built in dist/ (no runtime dependencies).");
