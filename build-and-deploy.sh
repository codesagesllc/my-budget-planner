#!/bin/bash
# Build and Deploy Script

echo "================================================"
echo "  Building and Deploying to Vercel"
echo "================================================"
echo ""

# Clean up
echo "Cleaning up..."
rm -f next.config.mjs 2>/dev/null
rm -f *.ps1 2>/dev/null

# Test build locally first
echo "Testing build locally..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "Deploying to Vercel..."
    vercel --prod --yes
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🚀 Deployment successful!"
        echo "Your app is live at: https://my-budget-planner-seven.vercel.app"
    else
        echo "❌ Deployment failed"
    fi
else
    echo ""
    echo "❌ Build failed. Fix the errors above before deploying."
fi