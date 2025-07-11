#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🧪 Starting Progressive JSON publish DRY RUN...\n");

// Step 1: Copy README to progressive-json package
console.log("📋 Step 1: Copying README to progressive-json package...");
try {
  execSync("cp README.md progressive-json/README.md", { stdio: "inherit" });
  console.log("✅ README copied successfully\n");
} catch (error) {
  console.error("❌ Failed to copy README:", error.message);
  process.exit(1);
}

// Step 2: Build the package
console.log("🔨 Step 2: Building progressive-json package...");
try {
  execSync("pnpm --filter @yoyo-org/progressive-json run build", { stdio: "inherit" });
  console.log("✅ Build completed successfully\n");
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}

// Step 3: Check if user is logged in to npm
console.log("🔐 Step 3: Checking npm authentication...");
try {
  const whoami = execSync("npm whoami", { stdio: "pipe" }).toString().trim();
  console.log(`✅ Logged in as: ${whoami}\n`);
} catch (error) {
  console.log("⚠️  Not logged in to npm\n");
}

// Step 4: Show what would be published
console.log("📦 Step 4: Checking what would be published...");
try {
  execSync("lerna changed", { stdio: "inherit" });
  console.log("\n");
} catch (error) {
  console.log("No changes detected\n");
}

// Step 5: Show version info
console.log("📈 Step 5: Current version info...");
try {
  execSync("lerna ls", { stdio: "inherit" });
  console.log("\n");
} catch (error) {
  console.error("❌ Failed to get version info:", error.message);
}

console.log("🎉 DRY RUN completed successfully!");
console.log("📝 To actually publish, run: npm run publish");
