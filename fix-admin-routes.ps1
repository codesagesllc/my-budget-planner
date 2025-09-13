# Fix all admin routes to use NextResponse
Write-Host "Fixing admin routes to use NextResponse..." -ForegroundColor Green

$adminRoutes = @(
    "app\api\admin\stats\route.ts",
    "app\api\admin\users\route.ts"
)

foreach ($file in $adminRoutes) {
    if (Test-Path $file) {
        Write-Host "Fixing: $file" -ForegroundColor Yellow
        
        $content = Get-Content $file -Raw
        
        # Add NextResponse to imports if not already there
        if ($content -notmatch "NextResponse") {
            $content = $content -replace "import { NextRequest }", "import { NextRequest, NextResponse }"
        }
        
        # Replace Response.json with NextResponse.json
        $content = $content -replace "return Response\.json\(", "return NextResponse.json("
        
        # Also ensure createClient is awaited if needed
        if ($content -match "const supabase = createClient\(\)") {
            $content = $content -replace "const supabase = createClient\(\)", "const supabase = await createClient()"
        }
        
        Set-Content -Path $file -Value $content -Encoding UTF8
        Write-Host "  Fixed!" -ForegroundColor Green
    }
}

Write-Host "`nDone! Now run: npm run build" -ForegroundColor Yellow