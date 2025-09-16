#!/bin/bash
# Deploy Directly to Vercel - Fixed Configuration

echo "================================================"
echo "  Deploying to Vercel (Fixed Configuration)"
echo "================================================"
echo ""

# Make sure we're using next.config.ts (not .mjs)
if [ -f "next.config.mjs" ]; then
    rm next.config.mjs
    echo "✓ Removed next.config.mjs"
fi

echo "✓ Using next.config.ts (minimal configuration)"
echo "✓ Fixed appConfig.app.url references"
echo ""

echo "Deploying to Vercel..."
vercel --prod --yes

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo "Your app should be live at: https://my-budget-planner-seven.vercel.app"
else
    echo ""
    echo "❌ Deployment failed. Check the error messages above."
fi
