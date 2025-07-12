#!/usr/bin/env node

const { execSync } = require("child_process");

console.log("🚀 Starting Progressive JSON publish process...\n");

console.log("🔨 Step 2: Building progressive-json package...");
try {
  execSync("pnpm --filter @yoyo-org/progressive-json run build", {
    stdio: "inherit",
  });
  console.log("✅ Build completed successfully\n");
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}

// Step 3: Check if user is logged in to npm
console.log("🔐 Step 3: Checking npm authentication...");
try {
  execSync("npm whoami", { stdio: "pipe" });
  console.log("✅ Already logged in to npm\n");
} catch (error) {
  console.log("⚠️  Not logged in to npm. Please login...");
  try {
    execSync("npm login", { stdio: "inherit" });
    console.log("✅ Successfully logged in to npm\n");
  } catch (loginError) {
    console.error("❌ Failed to login to npm:", loginError.message);
    process.exit(1);
  }
}

// Step 4: Version bump based on conventional commits
console.log("📈 Step 4: Bumping version based on conventional commits...");
try {
  execSync("lerna version --yes --conventional-commits", { stdio: "inherit" });
  console.log("✅ Version bumped successfully\n");
} catch (error) {
  console.error("❌ Version bump failed:", error.message);
  process.exit(1);
}

// Step 5: Publish to npm
console.log("📦 Step 5: Publishing to npm...");
try {
  execSync("lerna publish from-git --yes", { stdio: "inherit" });
  console.log("✅ Published to npm successfully\n");
} catch (error) {
  console.error("❌ Publish failed:", error.message);
  process.exit(1);
}

// Step 6: Push to git
console.log("🚀 Step 6: Pushing to git...");
try {
  execSync("git push --follow-tags", { stdio: "inherit" });
  console.log("✅ Pushed to git successfully\n");
} catch (error) {
  console.error("❌ Git push failed:", error.message);
  process.exit(1);
}

console.log("🎉 Publish process completed successfully!");
console.log("📦 Package has been published to npm");
console.log("🏷️  Git tags have been created and pushed");
