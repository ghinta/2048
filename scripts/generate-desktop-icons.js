import { readdir, rm } from "node:fs/promises";
import { run } from "@tauri-apps/cli";

await run(["icon", "assets/icon-source.png"]);
const directory = "src-tauri/icons";
const desktopIcons = new Set(["32x32.png", "128x128.png", "128x128@2x.png", "icon.icns", "icon.ico"]);
for (const entry of await readdir(directory)) {
  if (!desktopIcons.has(entry)) await rm(`${directory}/${entry}`, { recursive: true, force: true });
}
