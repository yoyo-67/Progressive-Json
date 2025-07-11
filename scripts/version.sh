#!/bin/bash

# Manual versioning script using Lerna
set -e

echo "🏷️  Manual versioning with Lerna..."

# Copy README.md to progressive-json directory
echo "📋 Copying README.md to progressive-json directory..."
cp README.md progressive-json/README.md

# Build the package first
echo "🔨 Building package..."
pnpm run build

# Use Lerna to version (this will create commits and tags)
echo "🏷️  Creating new version with Lerna..."
lerna version --conventional-commits

# Remove the copied README.md
echo "🧹 Cleaning up copied README.md..."
rm progressive-json/README.md

echo "✅ Versioning completed successfully!"
echo "📝 New version has been created and committed!"
echo "🚀 To publish, run: pnpm run publish" 