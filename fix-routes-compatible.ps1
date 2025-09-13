# Compatible PowerShell script for older versions
Write-Host "Fixing all API routes with Response.json..." -ForegroundColor Green

# Get all route.ts files in the API directory
$routeFiles = Get-ChildItem -Path "app\api" -Filter "route.ts" -Recurse

Write-Host "Found $($routeFiles.Count) route files" -ForegroundColor Yellow

$fixedCount = 0

foreach ($file in $routeFiles) {
    # Read file using .NET methods (compatible with older PowerShell)
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    
    # Check if file uses withAuth
    if ($content -match "withAuth") {
        $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
        Write-Host "`nChecking: $relativePath" -ForegroundColor Cyan
        
        # Add NextResponse to imports if not present
        if ($content -match "import \{ NextRequest \}" -and $content -notmatch "NextResponse") {
            $content = $content.Replace("import { NextRequest }", "import { NextRequest, NextResponse }")
            Write-Host "  Added NextResponse import" -ForegroundColor Gray
        }
        
        # Replace all Response.json with NextResponse.json
        if ($content -match "Response\.json") {
            $content = $content.Replace("Response.json(", "NextResponse.json(")
            Write-Host "  Replaced Response.json with NextResponse.json" -ForegroundColor Green
        }
    }
    
    if ($content -ne $original) {
        # Write file using .NET methods
        [System.IO.File]::WriteAllText($file.FullName, $content)
        $fixedCount++
        Write-Host "  File updated!" -ForegroundColor Green
    }
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Fixed $fixedCount route files" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan

# Specifically fix the usage-stats file
$usageStatsFile = "app\api\auth\usage-stats\route.ts"
if (Test-Path $usageStatsFile) {
    Write-Host "`nFixing usage-stats route..." -ForegroundColor Yellow
    $content = [System.IO.File]::ReadAllText($usageStatsFile)
    
    # Fix imports
    $content = $content.Replace("import { NextRequest } from 'next/server'", "import { NextRequest, NextResponse } from 'next/server'")
    
    # Fix Response.json
    $content = $content.Replace("Response.json(", "NextResponse.json(")
    
    [System.IO.File]::WriteAllText($usageStatsFile, $content)
    Write-Host "  Fixed!" -ForegroundColor Green
}

Write-Host "`nDone! Run 'npm run build' to continue" -ForegroundColor Yellow