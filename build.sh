#!/bin/bash

echo "🔧 Building My Budget Planner..."
echo "================================"

# Clean previous build
echo "📦 Cleaning previous build..."
rm -rf .next

# Type check
echo "🔍 Running type check..."
npm run type-check

if [ $? -ne 0 ]; then
  echo "❌ Type check failed!"
  exit 1
fi

echo "✅ Type check passed!"

# Build
echo "🏗️ Building application..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

echo "✅ Build completed successfully!"
echo "================================"
echo "🚀 Application is ready for deployment!"
