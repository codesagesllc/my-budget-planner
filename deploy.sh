#!/bin/bash
# Quick Deploy Script

echo "Deploying to Vercel..."

# Remove problematic files
rm -f next.config.mjs
rm -f *.ps1

# Deploy
vercel --prod --yes

echo ""
echo "Check deployment at: https://vercel.com/code-sages/my-budget-planner"
