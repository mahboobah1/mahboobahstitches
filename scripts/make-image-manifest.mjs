// Lists every photo in public/images so the admin photo picker can show them.
// Runs automatically before every build ("prebuild" in package.json), so photos you upload to
// public/images on GitHub appear in Admin after the next deploy. Optional descriptions come from
// public/images/alt-text.json ({ "file-name-without-extension": "description" }).
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";

const root = "public/images";
const exts = new Set([".webp", ".jpg", ".jpeg", ".png", ".avif"]);
const alt = existsSync(join(root, "alt-text.json")) ? JSON.parse(readFileSync(join(root, "alt-text.json"), "utf8")) : {};

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

if (!existsSync(root)) {
  console.log("No public/images folder yet; writing an empty photo list.");
  process.exit(0);
}
const images = walk(root)
  .filter((f) => exts.has(extname(f).toLowerCase()))
  .map((f) => {
    const path = "/" + relative("public", f).split("\\").join("/");
    const name = basename(f, extname(f));
    return { path, name, folder: relative(root, join(f, "..")).split("\\").join("/"), alt: alt[name] ?? "", kb: Math.round(statSync(f).size / 1024) };
  })
  .sort((a, b) => a.path.localeCompare(b.path));

writeFileSync(join(root, "manifest.json"), JSON.stringify({ images }, null, 1));
console.log(`Photo list: ${images.length} photos written to ${join(root, "manifest.json")}`);
