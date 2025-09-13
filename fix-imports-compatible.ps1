# PowerShell script compatible with older versions
Write-Host "Fixing ALL case-sensitive imports (Compatible Version)..." -ForegroundColor Green

# Get all TypeScript/TSX files
$files = Get-ChildItem -Path . -Include *.tsx,*.ts -Recurse | Where-Object { 
    $_.FullName -notmatch "node_modules" -and 
    $_.FullName -notmatch "\.next" -and
    $_.FullName -notmatch "\.git"
}

$totalFiles = $files.Count
$updatedCount = 0

Write-Host "Found $totalFiles files to check..." -ForegroundColor Yellow

foreach ($file in $files) {
    try {
        # Read file content (compatible with older PowerShell)
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $originalContent = $content
        
        # Fix Button imports
        $content = $content -replace "from\s+['""]@/components/ui/Button['""]", "from '@/components/ui/button'"
        $content = $content -replace "from\s+['""]\.\.?/ui/Button['""]", "from '../ui/button'"
        $content = $content -replace "from\s+['""]./Button['""]", "from './button'"
        
        # Fix Input imports
        $content = $content -replace "from\s+['""]@/components/ui/Input['""]", "from '@/components/ui/input'"
        $content = $content -replace "from\s+['""]\.\.?/ui/Input['""]", "from '../ui/input'"
        $content = $content -replace "from\s+['""]./Input['""]", "from './input'"
        
        # Fix other UI component imports
        $content = $content -replace "from\s+['""]@/components/ui/Card['""]", "from '@/components/ui/card'"
        $content = $content -replace "from\s+['""]@/components/ui/Label['""]", "from '@/components/ui/label'"
        $content = $content -replace "from\s+['""]@/components/ui/Select['""]", "from '@/components/ui/select'"
        $content = $content -replace "from\s+['""]@/components/ui/Tabs['""]", "from '@/components/ui/tabs'"
        
        if ($content -ne $originalContent) {
            # Write file back
            [System.IO.File]::WriteAllText($file.FullName, $content)
            Write-Host "  Fixed: $($file.Name)" -ForegroundColor Green
            $updatedCount++
        }
    }
    catch {
        Write-Host "  Error processing $($file.Name): $_" -ForegroundColor Red
    }
}

Write-Host "`nSummary:" -ForegroundColor Green
Write-Host "  Files checked: $totalFiles" -ForegroundColor White
Write-Host "  Files updated: $updatedCount" -ForegroundColor White

# Clean up old files
Write-Host "`nRemoving old files..." -ForegroundColor Yellow
if (Test-Path ".\components\ui\Button.old") {
    Remove-Item -Path ".\components\ui\Button.old" -Force
    Write-Host "  Removed Button.old" -ForegroundColor Gray
}
if (Test-Path ".\components\ui\Input.old") {
    Remove-Item -Path ".\components\ui\Input.old" -Force
    Write-Host "  Removed Input.old" -ForegroundColor Gray
}

# Clear Next.js cache
Write-Host "`nClearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path ".\.next") {
    Remove-Item -Path ".\.next" -Recurse -Force
    Write-Host "  Cleared .next cache" -ForegroundColor Gray
}

Write-Host "`n✅ Import fixes complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Run 'npm run build' to test locally" -ForegroundColor White
Write-Host "  2. If successful, commit: git add -A && git commit -m 'Fix case-sensitive imports'" -ForegroundColor White
Write-Host "  3. Push to deploy: git push" -ForegroundColor White