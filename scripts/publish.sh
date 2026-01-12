#!/bin/bash
# Publish all packages to npm
# Prerequisites: npm login, run prepublish:check first
set -e

echo "🚀 Publishing a2akit packages to npm..."
echo ""

# Verify we're logged into npm
echo "🔐 Verifying npm authentication..."
npm whoami > /dev/null 2>&1 || {
    echo "❌ Error: Not logged into npm. Please run 'npm login' first."
    exit 1
}
NPM_USER=$(npm whoami)
echo "✅ Logged in as: $NPM_USER"
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

# Publish packages in dependency order
echo "📦 Publishing @a2akit/core..."
cd packages/core
npm publish --access public
echo "✅ @a2akit/core published"
echo ""

echo "📦 Publishing @a2akit/express..."
cd ../express
npm publish --access public
echo "✅ @a2akit/express published"
echo ""

echo "📦 Publishing @a2akit/fastify..."
cd ../fastify
npm publish --access public
echo "✅ @a2akit/fastify published"
cd ../..
echo ""

echo "🎉 All packages published successfully!"
echo ""
echo "Packages:"
echo "  - https://www.npmjs.com/package/@a2akit/core"
echo "  - https://www.npmjs.com/package/@a2akit/express"
echo "  - https://www.npmjs.com/package/@a2akit/fastify"
