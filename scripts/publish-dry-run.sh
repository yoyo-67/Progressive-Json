#!/bin/bash

# Dry-run publishing script for progressive-json using Lerna
set -e

echo "🧪 DRY RUN: Lerna publishing process for @yoyo-org/progressive-json..."

# Copy README.md to progressive-json directory
echo "📋 Copying README.md to progressive-json directory..."
cp README.md progressive-json/README.md

# Build the package first
echo "🔨 Building package..."
pnpm run build

# Show what would be published with Lerna
echo "📋 Package contents that would be published:"
cd progressive-json
npm pack --dry-run
cd ..

# Show Lerna status
echo "📊 Lerna status:"
lerna changed

# Remove the copied README.md
echo "🧹 Cleaning up copied README.md..."
rm progressive-json/README.md

echo "✅ Dry run completed successfully!"
echo "💡 To actually publish, run: ./scripts/publish.sh"
echo "💡 To version manually first, run: pnpm run version" 