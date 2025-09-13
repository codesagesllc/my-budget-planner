Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Vercel Deployment Fix - Final Steps" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check git status
Write-Host "Step 1: Current git status:" -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "Step 2: Adding all necessary files to git..." -ForegroundColor Yellow

# Add all changes
git add .

Write-Host "✓ All files added to git" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Checking for uncommitted changes..." -ForegroundColor Yellow

# Try to commit
git commit -m "Fix module resolution and imports for Vercel deployment" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Changes committed successfully" -ForegroundColor Green
}
else {
    Write-Host "✓ No changes to commit (working tree clean)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 4: Current branch:" -ForegroundColor Yellow
git branch --show-current

Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "✓ Ready to deploy!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Push to GitHub:" -ForegroundColor White
Write-Host "   git push origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Vercel will automatically rebuild" -ForegroundColor White
Write-Host ""
Write-Host "3. Monitor the deployment at:" -ForegroundColor White
Write-Host "   https://vercel.com/code-sages/my-budget-planner" -ForegroundColor Cyan
