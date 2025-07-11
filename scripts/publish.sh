#!/bin/bash

# Publishing script for progressive-json using Lerna
set -e

echo "🚀 Starting Lerna publishing process for @yoyo-org/progressive-json..."

# Copy README.md to progressive-json directory
echo "📋 Copying README.md to progressive-json directory..."
cp README.md progressive-json/README.md

# Build the package first
echo "🔨 Building package..."
pnpm run build

# Use Lerna to publish (this will handle versioning and publishing)
echo "📦 Publishing with Lerna..."
lerna publish from-git --yes

# Remove the copied README.md
echo "🧹 Cleaning up copied README.md..."
rm progressive-json/README.md

echo "✅ Publishing completed successfully!"
echo "🎉 New version has been published and tagged!" 