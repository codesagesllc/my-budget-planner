# Quick fix for package installation issues

# Step 1: Try normal install
Write-Host "Attempting to install packages..." -ForegroundColor Yellow
npm install --legacy-peer-deps

if ($LASTEXITCODE -ne 0) {
    Write-Host "Standard install failed, trying alternative approach..." -ForegroundColor Yellow
    
    # Step 2: Install packages one by one if needed
    Write-Host "Installing core packages..." -ForegroundColor Cyan
    npm install react@19.1.0 react-dom@19.1.0 next@15.5.0 --legacy-peer-deps
    
    Write-Host "Installing Supabase packages..." -ForegroundColor Cyan
    npm install @supabase/supabase-js@latest @supabase/ssr@latest @supabase/auth-helpers-nextjs@latest --legacy-peer-deps
    
    Write-Host "Installing other dependencies..." -ForegroundColor Cyan
    npm install --legacy-peer-deps
}

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host "Running audit..." -ForegroundColor Yellow
npm audit

Write-Host ""
Write-Host "To start the app:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
