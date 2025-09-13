# Fix all createClient() calls that need await
Write-Host "Searching for createClient() calls without await..." -ForegroundColor Green

# Get all TypeScript files in app/api
$apiFiles = Get-ChildItem -Path "app\api" -Include *.ts,*.tsx -Recurse

$fixedCount = 0

foreach ($file in $apiFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    
    # Check if file has createClient
    if ($content -match "createClient\(\)") {
        $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
        Write-Host "`nChecking: $relativePath" -ForegroundColor Cyan
        
        # Look for patterns where createClient is not awaited
        # Pattern 1: const supabase = createClient()
        if ($content -match "const supabase = createClient\(\)") {
            $content = $content.Replace("const supabase = createClient()", "const supabase = await createClient()")
            Write-Host "  Fixed: Added await to createClient()" -ForegroundColor Green
        }
        
        # Pattern 2: const supabase = createServerActionClient()
        if ($content -match "const supabase = createServerActionClient\(\)") {
            $content = $content.Replace("const supabase = createServerActionClient()", "const supabase = await createServerActionClient()")
            Write-Host "  Fixed: Added await to createServerActionClient()" -ForegroundColor Green
        }
        
        # Pattern 3: const supabase = createServiceRoleClient()
        if ($content -match "const supabase = createServiceRoleClient\(\)") {
            $content = $content.Replace("const supabase = createServiceRoleClient()", "const supabase = await createServiceRoleClient()")
            Write-Host "  Fixed: Added await to createServiceRoleClient()" -ForegroundColor Green
        }
    }
    
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        $fixedCount++
    }
}

# Also check components that might use createClient
Write-Host "`n`nChecking component files..." -ForegroundColor Yellow

$componentFiles = Get-ChildItem -Path "components" -Include *.ts,*.tsx -Recurse -ErrorAction SilentlyContinue
$appFiles = Get-ChildItem -Path "app" -Include *.ts,*.tsx -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "\\api\\" }

$allFiles = @()
if ($componentFiles) { $allFiles += $componentFiles }
if ($appFiles) { $allFiles += $appFiles }

foreach ($file in $allFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    
    if ($content -match "createClient\(\)" -or $content -match "createServerActionClient\(\)" -or $content -match "createServiceRoleClient\(\)") {
        $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
        Write-Host "`nChecking: $relativePath" -ForegroundColor Cyan
        
        # Fix patterns
        $content = $content.Replace("const supabase = createClient()", "const supabase = await createClient()")
        $content = $content.Replace("const supabase = createServerActionClient()", "const supabase = await createServerActionClient()")
        $content = $content.Replace("const supabase = createServiceRoleClient()", "const supabase = await createServiceRoleClient()")
        
        if ($content -ne $original) {
            [System.IO.File]::WriteAllText($file.FullName, $content)
            Write-Host "  Fixed!" -ForegroundColor Green
            $fixedCount++
        }
    }
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Fixed $fixedCount files" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan

Write-Host "`nRun 'npm run build' to continue" -ForegroundColor Yellow