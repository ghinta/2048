import { copyFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const target = process.argv[2];
if (!/^[a-z0-9_]+(?:-[a-z0-9_]+)+$/.test(target || "")) throw new Error("Pass the Rust target triple.");
const root = join("src-tauri", "target", target, "release", "bundle");
const packages = (await readdir(root, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.(?:exe|msi|dmg|deb|AppImage)$/.test(entry.name));
if (!packages.length) throw new Error(`No desktop installers in ${root}`);
await mkdir("desktop-artifacts", { recursive: true });
for (const entry of packages) {
  await copyFile(join(entry.parentPath, entry.name), join("desktop-artifacts", entry.name));
  console.log(entry.name);
}
