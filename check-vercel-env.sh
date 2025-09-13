#!/bin/bash
# Check Vercel Environment Variables

echo "================================================"
echo "  Checking Vercel Environment Variables"
echo "================================================"
echo ""

# List all environment variables
echo "Listing all environment variables in the project..."
echo ""

vercel env ls

echo ""
echo "================================================"
echo ""
echo "If you see variables with @ references like:"
echo "  NEXT_PUBLIC_SUPABASE_URL = @supabase_url"
echo ""
echo "These need to be fixed. Run:"
echo "  PowerShell: .\fix-vercel-env.ps1"
echo "  or"
echo "  Bash: ./fix-vercel-env.sh"
echo ""
echo "================================================"
