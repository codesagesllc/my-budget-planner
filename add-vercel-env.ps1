# Add Environment Variables to Vercel
Write-Host "Adding environment variables to Vercel..." -ForegroundColor Green
Write-Host "Make sure you're logged in to Vercel CLI (vercel login)" -ForegroundColor Yellow

# Function to add environment variable
function Add-VercelEnv {
    param(
        [string]$name,
        [string]$value,
        [string]$environment = "production preview development"
    )
    
    Write-Host "Adding $name..." -ForegroundColor Cyan
    
    # Remove if exists (to update)
    vercel env rm $name --yes 2>$null
    
    # Add the variable for all environments
    echo $value | vercel env add $name $environment
}

# Supabase Configuration
Add-VercelEnv "NEXT_PUBLIC_SUPABASE_URL" "https://ftnihylyezhlzzvolltr.supabase.co"
Add-VercelEnv "NEXT_PUBLIC_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0bmloeWx5ZXpobHp6dm9sbHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ3MDYsImV4cCI6MjA3MDY5MDcwNn0.GSmOERXwG4KB_AdBntGUndUlBlElUah3X-Foys9n7rU"
Add-VercelEnv "SUPABASE_SERVICE_ROLE_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0bmloeWx5ZXpobHp6dm9sbHRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExNDcwNiwiZXhwIjoyMDcwNjkwNzA2fQ.8FkRhQrH0DQP6OSWHbMLHQeQeyprRy9H8MCNzN9laIU"

# Stripe Configuration (Using your LIVE keys)
Add-VercelEnv "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "pk_live_51P4YU84GH1CShai70UHPVCyupt70Uzkc9qW2xPHUeVFbS3PylZQaCbrVw4EBpfNeE123WvqPLiA2tCbTt9hEdtgS00TN4tI47H"
Add-VercelEnv "STRIPE_SECRET_KEY" "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"
Add-VercelEnv "STRIPE_WEBHOOK_SECRET" "whsec_rjsdap8R7QYspvjIjytnIU8Wdx2XQQ8P"

# Plaid Configuration (Sandbox for testing)
Add-VercelEnv "PLAID_CLIENT_ID" "68a75bb19009c300280ac2d2"
Add-VercelEnv "PLAID_SECRET" "bf9c138604472a806c192c7ed6bf41"
Add-VercelEnv "PLAID_ENV" "sandbox"
Add-VercelEnv "PLAID_PRODUCTS" "transactions,accounts,liabilities"
Add-VercelEnv "PLAID_COUNTRY_CODES" "US"

# Anthropic AI Configuration
Add-VercelEnv "ANTHROPIC_API_KEY" "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"

# Application Configuration
Add-VercelEnv "NEXT_PUBLIC_APP_URL" "https://my-budget-planner-seven.vercel.app"

# Admin Configuration
Add-VercelEnv "NEXT_PUBLIC_ADMIN_EMAILS" "carletonj.batten@gmail.com"
Add-VercelEnv "NEXT_PUBLIC_ADMIN_DOMAINS" "codesages.net"

Write-Host "" -ForegroundColor Green
Write-Host "✅ Environment variables added successfully!" -ForegroundColor Green
Write-Host "" -ForegroundColor Yellow
Write-Host "Now push your changes to trigger a new deployment:" -ForegroundColor Yellow
Write-Host "  git add ." -ForegroundColor Cyan
Write-Host "  git commit -m 'Fix Vercel deployment - remove secret references'" -ForegroundColor Cyan
Write-Host "  git push origin main" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Green
Write-Host "Your deployment should now work! 🚀" -ForegroundColor Green
