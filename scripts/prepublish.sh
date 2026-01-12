#!/bin/bash
# Pre-publish verification script
# Run this before publishing to npm to ensure everything is in order
set -e

echo "🔍 Running pre-publish checks..."
echo ""

# Check for uncommitted changes
echo "📋 Checking for uncommitted changes..."
if ! git diff --exit-code > /dev/null 2>&1; then
    echo "❌ Error: You have uncommitted changes. Please commit or stash them first."
    exit 1
fi
if ! git diff --cached --exit-code > /dev/null 2>&1; then
    echo "❌ Error: You have staged changes. Please commit them first."
    exit 1
fi
echo "✅ No uncommitted changes"
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
pnpm clean
echo "✅ Clean complete"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
echo "✅ Dependencies installed"
echo ""

# Run linting
echo "🔧 Running linter..."
pnpm lint || echo "⚠️ Linting warnings detected (continuing)"
echo ""

# Build all packages
echo "🏗️ Building packages..."
pnpm build
echo "✅ Build complete"
echo ""

# Run tests
echo "🧪 Running tests..."
pnpm test
echo "✅ Tests passed"
echo ""

# Check package contents
echo "📦 Checking package contents..."
echo ""
echo "=== @a2akit/core ==="
cd packages/core && npm pack --dry-run 2>&1 | head -30
echo ""

echo "=== @a2akit/express ==="
cd ../express && npm pack --dry-run 2>&1 | head -30
echo ""

echo "=== @a2akit/fastify ==="
cd ../fastify && npm pack --dry-run 2>&1 | head -30
cd ../..
echo ""

echo "✅ All pre-publish checks passed!"
echo ""
echo "You can now publish with: pnpm publish:all"
