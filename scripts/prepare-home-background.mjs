import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, "assets", "home-background");
const outputDir = path.join(root, "public");
const outputFile = path.join(outputDir, "laneriq-future-city-people.webp");

const parts = fs.readdirSync(sourceDir)
  .filter((name) => /^part\d+\.b64$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (!parts.length) {
  throw new Error("LANERIQ homepage background parts are missing.");
}

const encoded = parts
  .map((name) => fs.readFileSync(path.join(sourceDir, name), "utf8"))
  .join("")
  .replace(/\s+/g, "");

const image = Buffer.from(encoded, "base64");
const riff = image.subarray(0, 4).toString("ascii");
const webp = image.subarray(8, 12).toString("ascii");

if (riff !== "RIFF" || webp !== "WEBP" || image.length < 50_000) {
  throw new Error("LANERIQ homepage background is not a valid WebP image.");
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, image);
console.log(`Prepared ${path.relative(root, outputFile)} from ${parts.length} parts (${image.length} bytes).`);
