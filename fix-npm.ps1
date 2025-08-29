# PowerShell script to fix npm issues
Write-Host "Fixing npm dependencies and vulnerabilities..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean old files
Write-Host "Step 1: Cleaning old files..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  Cleaned .next folder" -ForegroundColor Green
}

# Step 2: Install dependencies (this creates package-lock.json)
Write-Host ""
Write-Host "Step 2: Installing dependencies..." -ForegroundColor Yellow
Write-Host "  This will create package-lock.json" -ForegroundColor Gray
npm install --legacy-peer-deps

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "  Warning: Some issues during installation" -ForegroundColor Yellow
}

# Step 3: Check for vulnerabilities
Write-Host ""
Write-Host "Step 3: Checking for vulnerabilities..." -ForegroundColor Yellow
npm audit

# Step 4: Try to fix vulnerabilities if any exist
Write-Host ""
Write-Host "Step 4: Attempting to fix vulnerabilities..." -ForegroundColor Yellow
npm audit fix --legacy-peer-deps

# Step 5: Final check
Write-Host ""
Write-Host "Step 5: Final security check..." -ForegroundColor Yellow
npm audit

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the development server:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
