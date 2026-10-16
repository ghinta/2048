import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const path of ["index.html", "styles.css", "platform.css", "manifest.webmanifest", "src", "assets", ".nojekyll"]) {
  await cp(path, `dist/${path}`, { recursive: true });
}

// Keep a deployment's HTML, styles and modules together in browser caches.
const modules = ["src/app.js", "src/game.js", "src/platform.js", "src/install.js"];
const assets = ["assets/icon.svg", "assets/icon-192.png", "assets/icon-512.png", "assets/icon-maskable-512.png", "assets/apple-touch-icon.png"];
const files = ["index.html", "styles.css", "platform.css", "manifest.webmanifest", "sw.js", ...modules, ...assets];
const sources = Object.fromEntries(await Promise.all(files.map(async (path) => [path, await readFile(path)])));
const hash = createHash("sha256");
for (const path of files) hash.update(path).update("\0").update(sources[path]).update("\0");
const version = hash.digest("hex").slice(0, 12);
const versioned = (path) => `${path}?v=${version}`;
const html = sources["index.html"].toString()
  .replace('href="./styles.css"', `href="./styles.css?v=${version}"`)
  .replace('href="./platform.css"', `href="./platform.css?v=${version}"`)
  .replace('src="./src/platform.js"', `src="./src/platform.js?v=${version}"`)
  .replace('src="./src/install.js"', `src="./src/install.js?v=${version}"`)
  .replace('href="./manifest.webmanifest"', `href="./manifest.webmanifest?v=${version}"`)
  .replace('href="./assets/apple-touch-icon.png"', `href="./assets/apple-touch-icon.png?v=${version}"`)
  .replace('src="./src/app.js"', `src="./src/app.js?v=${version}"`);
const app = sources["src/app.js"].toString().replace('"./game.js"', `"./game.js?v=${version}"`);
const manifest = JSON.parse(sources["manifest.webmanifest"].toString());
manifest.icons = manifest.icons.map((icon) => ({ ...icon, src: versioned(icon.src) }));
const shell = ["./", "./index.html", versioned("./manifest.webmanifest"), ...["styles.css", "platform.css", ...modules].map((path) => versioned(`./${path}`)), "./assets/icon.svg", ...assets.filter((path) => path.endsWith(".png")).map((path) => versioned(`./${path}`))];
const worker = sources["sw.js"].toString().replace('const VERSION = "development";', `const VERSION = ${JSON.stringify(version)};`).replace("const APP_SHELL = [];", `const APP_SHELL = ${JSON.stringify(shell, null, 2)};`);
await Promise.all([
  writeFile("dist/index.html", html),
  writeFile("dist/src/app.js", app),
  writeFile("dist/manifest.webmanifest", JSON.stringify(manifest, null, 2)),
  writeFile("dist/sw.js", worker),
]);
console.log("Static site built in dist/ (no runtime dependencies).");
