#!/bin/bash
# Final Deploy Script - All Fixes Applied

echo "================================================"
echo "  Final Deployment to Vercel"
echo "================================================"
echo ""

# Clean up problematic files
echo "Cleaning up..."
rm -f next.config.mjs 2>/dev/null
rm -f *.ps1 2>/dev/null
rm -f fix-*.sh 2>/dev/null
rm -f check-*.sh 2>/dev/null
rm -f diagnose-*.sh 2>/dev/null

echo "✓ Cleanup complete"
echo ""

# Summary of fixes
echo "Fixes Applied:"
echo "✓ TypeScript errors fixed in admin routes"
echo "✓ TypeScript error fixed in bills/create-from-ai route"
echo "✓ appConfig.app.url references fixed"
echo "✓ Dynamic rendering for protected routes"
echo "✓ Build-time Supabase handling"
echo ""

# Deploy to Vercel
echo "Deploying to Vercel Production..."
vercel --prod --yes

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "  🚀 DEPLOYMENT SUCCESSFUL!"
    echo "================================================"
    echo ""
    echo "Your app is live at:"
    echo "https://my-budget-planner-seven.vercel.app"
    echo ""
    echo "Dashboard:"
    echo "https://vercel.com/code-sages/my-budget-planner"
else
    echo ""
    echo "❌ Deployment failed - check errors above"
fi