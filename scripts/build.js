import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const path of ["index.html", "styles.css", "platform.css", "manifest.webmanifest", "src", "assets", ".nojekyll"]) {
  await cp(path, `dist/${path}`, { recursive: true, filter: (source) => !source.endsWith("icon-source.png") });
}

// Keep a deployment's HTML, styles and modules together in browser caches.
const icons = ["assets/favicon-32.png", "assets/icon-192.png", "assets/icon-512.png", "assets/icon-maskable-512.png", "assets/apple-touch-icon.png"];
const contents = await Promise.all(["index.html", "styles.css", "src/app.js", "src/game.js", "platform.css", "src/platform.js"].map((path) => readFile(`dist/${path}`, "utf8")));
const hash = createHash("sha256").update(contents.join("\0"));
for (const path of ["manifest.webmanifest", ...icons]) hash.update(await readFile(`dist/${path}`));
const version = hash.digest("hex").slice(0, 12);
const html = contents[0]
  .replace('href="./styles.css"', `href="./styles.css?v=${version}"`)
  .replace('href="./platform.css"', `href="./platform.css?v=${version}"`)
  .replace('src="./src/platform.js"', `src="./src/platform.js?v=${version}"`)
  .replace('src="./src/app.js"', `src="./src/app.js?v=${version}"`);
let versionedHTML = html.replace('href="./manifest.webmanifest"', `href="./manifest.webmanifest?v=${version}"`);
for (const icon of icons) versionedHTML = versionedHTML.replaceAll(`"./${icon}"`, `"./${icon}?v=${version}"`);
const manifest = JSON.parse(await readFile("dist/manifest.webmanifest", "utf8"));
manifest.icons = manifest.icons.map((icon) => ({ ...icon, src: `${icon.src}?v=${version}` }));
const app = contents[2].replace('"./game.js"', `"./game.js?v=${version}"`);
await Promise.all([
  writeFile("dist/index.html", versionedHTML),
  writeFile("dist/src/app.js", app),
  writeFile("dist/manifest.webmanifest", JSON.stringify(manifest, null, 2)),
]);
console.log("Static site built in dist/ (no runtime dependencies).");
