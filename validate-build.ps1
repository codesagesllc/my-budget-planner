Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Next.js 15.5 Build Validation Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Clean build cache
Write-Host "Step 1: Cleaning build cache..." -ForegroundColor Yellow
if (Test-Path .\.next) {
    Remove-Item -Path .\.next -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ .next directory removed" -ForegroundColor Green
}
if (Test-Path .\node_modules\.cache) {
    Remove-Item -Path .\node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ node_modules/.cache removed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 2: Verifying UI component structure..." -ForegroundColor Yellow

# Check if all UI files exist
$uiFiles = @(
    "button.tsx",
    "input.tsx", 
    "Alert.tsx",
    "card.tsx",
    "label.tsx",
    "select.tsx",
    "tabs.tsx",
    "usage-meter.tsx",
    "index.ts"
)

$allFilesExist = $true
foreach ($file in $uiFiles) {
    $path = ".\components\ui\$file"
    if (Test-Path $path) {
        Write-Host "  ✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file missing!" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "ERROR: Some UI component files are missing!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Checking Next.js configuration..." -ForegroundColor Yellow
if (Test-Path .\next.config.mjs) {
    Write-Host "  ✓ next.config.mjs exists" -ForegroundColor Green
    
    # Check for invalid options
    $config = Get-Content .\next.config.mjs -Raw
    if ($config -match "swcMinify") {
        Write-Host "  ⚠ Warning: swcMinify is deprecated in Next.js 15" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ next.config.mjs missing!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 4: Validating TypeScript configuration..." -ForegroundColor Yellow
$tsconfig = Get-Content .\tsconfig.json | ConvertFrom-Json
if ($tsconfig.compilerOptions.baseUrl) {
    Write-Host "  ✓ baseUrl is set to: $($tsconfig.compilerOptions.baseUrl)" -ForegroundColor Green
} else {
    Write-Host "  ✗ baseUrl is not set in tsconfig.json!" -ForegroundColor Red
}

if ($tsconfig.compilerOptions.paths.'@/*') {
    Write-Host "  ✓ Path alias '@/*' is configured" -ForegroundColor Green
} else {
    Write-Host "  ✗ Path alias '@/*' is not configured!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Step 5: Running Next.js build..." -ForegroundColor Yellow
Write-Host ""

# Run the build
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "✗ BUILD FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "1. Run: npm install" -ForegroundColor White
    Write-Host "2. Check for TypeScript errors: npm run type-check" -ForegroundColor White
    Write-Host "3. Clear all caches and retry" -ForegroundColor White
}
