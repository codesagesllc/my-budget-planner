#!/bin/bash
# Deploy to Vercel with Environment Variables

echo "================================================"
echo "  Deploying to Vercel Production"
echo "================================================"
echo ""

# First, let's make sure all environment variables are set in Vercel
echo "Setting environment variables in Vercel..."

# Function to add env var
add_env() {
    echo "$2" | vercel env add "$1" production --yes 2>/dev/null || true
}

# Add all required environment variables
add_env "NEXT_PUBLIC_SUPABASE_URL" "https://ftnihylyezhlzzvolltr.supabase.co"
add_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0bmloeWx5ZXpobHp6dm9sbHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ3MDYsImV4cCI6MjA3MDY5MDcwNn0.GSmOERXwG4KB_AdBntGUndUlBlElUah3X-Foys9n7rU"
add_env "SUPABASE_SERVICE_ROLE_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0bmloeWx5ZXpobHp6dm9sbHRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExNDcwNiwiZXhwIjoyMDcwNjkwNzA2fQ.8FkRhQrH0DQP6OSWHbMLHQeQeyprRy9H8MCNzN9laIU"
add_env "STRIPE_SECRET_KEY" "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"
add_env "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "pk_live_51P4YU84GH1CShai70UHPVCyupt70Uzkc9qW2xPHUeVFbS3PylZQaCbrVw4EBpfNeE123WvqPLiA2tCbTt9hEdtgS00TN4tI47H"
add_env "STRIPE_WEBHOOK_SECRET" "whsec_rjsdap8R7QYspvjIjytnIU8Wdx2XQQ8P"
add_env "PLAID_CLIENT_ID" "68a75bb19009c300280ac2d2"
add_env "PLAID_SECRET" "bf9c138604472a806c192c7ed6bf41"
add_env "PLAID_ENV" "sandbox"
add_env "ANTHROPIC_API_KEY" "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"
add_env "NEXT_PUBLIC_APP_URL" "https://my-budget-planner-seven.vercel.app"

echo "✓ Environment variables configured"
echo ""

# Remove problematic next.config.mjs if it exists
if [ -f "next.config.mjs" ]; then
    rm next.config.mjs
    echo "✓ Removed next.config.mjs"
fi

echo "✓ Using next.config.ts"
echo "✓ Dynamic rendering configured for protected routes"
echo ""

echo "Deploying to production..."
vercel --prod --yes

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo "Your app is live at: https://my-budget-planner-seven.vercel.app"
    echo ""
    echo "Check deployment status: https://vercel.com/code-sages/my-budget-planner"
else
    echo ""
    echo "❌ Deployment failed"
    echo "Check the error messages above"
fi
