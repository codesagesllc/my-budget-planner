#!/bin/bash

echo "======================================"
echo "Build Cleanup and Test Script"
echo "======================================"
echo ""

echo "Step 1: Removing build artifacts..."
rm -rf .next
rm -rf node_modules/.cache
rm -f tsconfig.tsbuildinfo
echo "✓ Build artifacts removed"

echo ""
echo "Step 2: Reinstalling dependencies..."
npm install
echo "✓ Dependencies installed"

echo ""
echo "Step 3: Running type check..."
npm run type-check || true

echo ""
echo "Step 4: Running build..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "======================================"
    echo "✓ BUILD SUCCESSFUL!"
    echo "======================================"
else
    echo ""
    echo "======================================"
    echo "✗ BUILD FAILED"
    echo "======================================"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check for TypeScript errors: npm run type-check"
    echo "2. Clear all caches: rm -rf .next node_modules/.cache"
    echo "3. Reinstall dependencies: rm -rf node_modules && npm install"
fi
