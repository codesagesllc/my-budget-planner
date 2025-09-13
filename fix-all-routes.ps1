# PowerShell script to fix all API routes using withAuth
Write-Host "Searching for all API routes with Response.json..." -ForegroundColor Green

# Get all route.ts files in the API directory
$routeFiles = Get-ChildItem -Path "app\api" -Filter "route.ts" -Recurse

Write-Host "Found $($routeFiles.Count) route files" -ForegroundColor Yellow

$fixedCount = 0

foreach ($file in $routeFiles) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Check if file uses withAuth
    if ($content -match "withAuth") {
        Write-Host "`nChecking: $($file.FullName.Replace((Get-Location).Path + '\', ''))" -ForegroundColor Cyan
        
        # Add NextResponse to imports if not present
        if ($content -match "import \{ NextRequest \}" -and $content -notmatch "NextResponse") {
            $content = $content -replace "import \{ NextRequest \}", "import { NextRequest, NextResponse }"
            Write-Host "  Added NextResponse import" -ForegroundColor Gray
        }
        
        # Replace all Response.json with NextResponse.json
        if ($content -match "Response\.json") {
            $content = $content -replace "Response\.json\(", "NextResponse.json("
            Write-Host "  Replaced Response.json with NextResponse.json" -ForegroundColor Green
        }
    }
    
    # Also check files that don't use withAuth but still have Response.json
    elseif ($content -match "Response\.json") {
        Write-Host "`nChecking: $($file.FullName.Replace((Get-Location).Path + '\', ''))" -ForegroundColor Cyan
        
        # These might be fine, but let's log them
        Write-Host "  Has Response.json but no withAuth - may be OK" -ForegroundColor Yellow
    }
    
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        $fixedCount++
    }
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Fixed $fixedCount route files" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan

Write-Host "`nNow checking specific file: app\api\auth\usage-stats\route.ts" -ForegroundColor Yellow

# Fix the specific file mentioned in the error
$usageStatsFile = "app\api\auth\usage-stats\route.ts"
if (Test-Path $usageStatsFile) {
    $content = Get-Content $usageStatsFile -Raw
    
    # Fix imports
    $content = $content -replace "import \{ NextRequest \} from 'next/server'", "import { NextRequest, NextResponse } from 'next/server'"
    
    # Fix Response.json
    $content = $content -replace "return Response\.json\(", "return NextResponse.json("
    
    Set-Content -Path $usageStatsFile -Value $content -Encoding UTF8
    Write-Host "  Fixed usage-stats route!" -ForegroundColor Green
}

Write-Host "`nDone! Run 'npm run build' to continue" -ForegroundColor Yellow