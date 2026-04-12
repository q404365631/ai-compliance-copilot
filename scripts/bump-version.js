#!/usr/bin/env node
// Bumps the patch version in all workspace package.json files.
// Run from the repo root: node scripts/bump-version.js

const fs = require("fs");
const path = require("path");

const PACKAGES = [
  "package.json",
  "apps/extension/package.json",
  "packages/detection-engine/package.json",
  "packages/policy-engine/package.json",
  "packages/shared-types/package.json",
];

const rootPkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const [major, minor, patch] = rootPkg.version.split(".").map(Number);
const newVersion = `${major}.${minor}.${patch + 1}`;

for (const rel of PACKAGES) {
  const full = path.resolve(rel);
  if (!fs.existsSync(full)) {
    console.warn(`Skipping missing file: ${rel}`);
    continue;
  }
  const pkg = JSON.parse(fs.readFileSync(full, "utf8"));
  pkg.version = newVersion;
  fs.writeFileSync(full, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`  ${rel}  →  ${newVersion}`);
}

// Keep the extension manifest in sync — it's the version shown in the browser
// and required for Chrome Web Store updates.
const manifestPath = "apps/extension/public/manifest.json";
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.version = newVersion;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`  ${manifestPath}  →  ${newVersion}`);
}

console.log(`\nVersion bumped to ${newVersion}`);
