# Fix Vercel Environment Variables
# This script will properly set up all environment variables for the my-budget-planner project

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Vercel Environment Variables Setup/Fix Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI is not installed!" -ForegroundColor Red
    Write-Host "Please install it first: npm i -g vercel" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Vercel CLI found" -ForegroundColor Green

# Check if logged in
Write-Host "Checking Vercel login status..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1
if ($whoami -match "Error") {
    Write-Host "Please login to Vercel first:" -ForegroundColor Yellow
    vercel login
}

Write-Host "Logged in as: $whoami" -ForegroundColor Green
Write-Host ""

# List current environment variables (for reference)
Write-Host "Checking existing environment variables..." -ForegroundColor Yellow
Write-Host "Note: We'll update existing ones and add missing ones" -ForegroundColor Gray
Write-Host ""

# Environment variables configuration
$envVars = @(
    @{
        Name = "NEXT_PUBLIC_SUPABASE_URL"
        Value = "https://ftnihylyezhlzzvolltr.supabase.co"
        Type = "plain"
    },
    @{
        Name = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        Value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0bmloeWx5ZXpobHp6dm9sbHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ3MDYsImV4cCI6MjA3MDY5MDcwNn0.GSmOERXwG4KB_AdBntGUndUlBlElUah3X-Foys9n7rU"
        Type = "plain"
    },
    @{
        Name = "SUPABASE_SERVICE_ROLE_KEY"
        Value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0bmloeWx5ZXpobHp6dm9sbHRyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExNDcwNiwiZXhwIjoyMDcwNjkwNzA2fQ.8FkRhQrH0DQP6OSWHbMLHQeQeyprRy9H8MCNzN9laIU"
        Type = "encrypted"
    },
    @{
        Name = "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
        Value = "pk_live_51P4YU84GH1CShai70UHPVCyupt70Uzkc9qW2xPHUeVFbS3PylZQaCbrVw4EBpfNeE123WvqPLiA2tCbTt9hEdtgS00TN4tI47H"
        Type = "plain"
    },
    @{
        Name = "STRIPE_SECRET_KEY"
        Value = "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"
        Type = "encrypted"
    },
    @{
        Name = "STRIPE_WEBHOOK_SECRET"
        Value = "whsec_rjsdap8R7QYspvjIjytnIU8Wdx2XQQ8P"
        Type = "encrypted"
    },
    @{
        Name = "PLAID_CLIENT_ID"
        Value = "68a75bb19009c300280ac2d2"
        Type = "plain"
    },
    @{
        Name = "PLAID_SECRET"
        Value = "bf9c138604472a806c192c7ed6bf41"
        Type = "encrypted"
    },
    @{
        Name = "PLAID_ENV"
        Value = "sandbox"
        Type = "plain"
    },
    @{
        Name = "PLAID_PRODUCTS"
        Value = "transactions,accounts,liabilities"
        Type = "plain"
    },
    @{
        Name = "PLAID_COUNTRY_CODES"
        Value = "US"
        Type = "plain"
    },
    @{
        Name = "ANTHROPIC_API_KEY"
        Value = "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"
        Type = "encrypted"
    },
    @{
        Name = "NEXT_PUBLIC_APP_URL"
        Value = "https://my-budget-planner-seven.vercel.app"
        Type = "plain"
    },
    @{
        Name = "NEXT_PUBLIC_ADMIN_EMAILS"
        Value = "carletonj.batten@gmail.com"
        Type = "plain"
    },
    @{
        Name = "NEXT_PUBLIC_ADMIN_DOMAINS"
        Value = "codesages.net"
        Type = "plain"
    }
)

# Counter for progress
$total = $envVars.Count
$current = 0

Write-Host "Setting up $total environment variables..." -ForegroundColor Cyan
Write-Host ""

# Process each environment variable
foreach ($env in $envVars) {
    $current++
    $progress = [math]::Round(($current / $total) * 100)
    
    Write-Host "[$current/$total] Setting $($env.Name)..." -ForegroundColor Yellow
    
    # First, try to remove if it exists (to update)
    $null = vercel env rm $env.Name --yes 2>$null
    
    # Add the variable for all environments
    $env.Value | vercel env add $env.Name production preview development | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $($env.Name) configured successfully" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Issue with $($env.Name) - may already exist with correct value" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Environment Variables Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Now trigger a deployment
Write-Host "Ready to deploy! Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Commit and push your changes:" -ForegroundColor Yellow
Write-Host "   git add ." -ForegroundColor Gray
Write-Host "   git commit -m 'Fix deployment - update vercel.json and env vars'" -ForegroundColor Gray
Write-Host "   git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Or deploy directly with Vercel CLI:" -ForegroundColor Yellow
Write-Host "   vercel --prod" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Check deployment status at:" -ForegroundColor Yellow
Write-Host "   https://vercel.com/code-sages/my-budget-planner" -ForegroundColor Cyan
Write-Host ""

# Optional: Ask if user wants to deploy now
$deploy = Read-Host "Do you want to deploy now? (y/n)"
if ($deploy -eq 'y') {
    Write-Host ""
    Write-Host "Deploying to production..." -ForegroundColor Yellow
    vercel --prod
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🚀 Deployment initiated successfully!" -ForegroundColor Green
        Write-Host "Check status at: https://vercel.com/code-sages/my-budget-planner" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "Skipping deployment. Push to GitHub when ready to deploy." -ForegroundColor Yellow
}
