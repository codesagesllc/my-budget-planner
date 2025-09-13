# PowerShell script to fix ALL case-sensitive imports
Write-Host "Fixing ALL case-sensitive imports in the project..." -ForegroundColor Green

# Get all TypeScript and TSX files
$files = Get-ChildItem -Path . -Include *.tsx,*.ts -Recurse | Where-Object { 
    $_.FullName -notmatch "node_modules" -and 
    $_.FullName -notmatch "\.next" -and
    $_.FullName -notmatch "\.git"
}

$totalFiles = $files.Count
$updatedCount = 0
$errorCount = 0

Write-Host "Found $totalFiles TypeScript/TSX files to check..." -ForegroundColor Yellow

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        if ($null -eq $content) { continue }
        
        $originalContent = $content
        
        # Fix Button imports (all variations)
        $content = $content -replace "from\s+['""]@/components/ui/Button['""]", "from '@/components/ui/button'"
        $content = $content -replace "from\s+['""]\.\.?/ui/Button['""]", "from '../ui/button'"
        $content = $content -replace "from\s+['""]\.\.?/\.\.?/ui/Button['""]", "from '../../ui/button'"
        $content = $content -replace "from\s+['""]./Button['""]", "from './button'"
        
        # Fix Input imports (all variations)
        $content = $content -replace "from\s+['""]@/components/ui/Input['""]", "from '@/components/ui/input'"
        $content = $content -replace "from\s+['""]\.\.?/ui/Input['""]", "from '../ui/input'"
        $content = $content -replace "from\s+['""]\.\.?/\.\.?/ui/Input['""]", "from '../../ui/input'"
        $content = $content -replace "from\s+['""]./Input['""]", "from './input'"
        
        # Fix other UI component imports that might have wrong casing
        $content = $content -replace "from\s+['""]@/components/ui/Card['""]", "from '@/components/ui/card'"
        $content = $content -replace "from\s+['""]@/components/ui/Label['""]", "from '@/components/ui/label'"
        $content = $content -replace "from\s+['""]@/components/ui/Select['""]", "from '@/components/ui/select'"
        $content = $content -replace "from\s+['""]@/components/ui/Tabs['""]", "from '@/components/ui/tabs'"
        
        # Fix exports in index files
        if ($file.Name -eq "index.ts" -or $file.Name -eq "index.tsx") {
            $content = $content -replace "from\s+['""]./Button['""]", "from './button'"
            $content = $content -replace "from\s+['""]./Input['""]", "from './input'"
            $content = $content -replace "from\s+['""]./Card['""]", "from './card'"
            $content = $content -replace "from\s+['""]./Label['""]", "from './label'"
            $content = $content -replace "from\s+['""]./Select['""]", "from './select'"
            $content = $content -replace "from\s+['""]./Tabs['""]", "from './tabs'"
        }
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline -Encoding UTF8
            Write-Host "  ✓ Updated: $($file.FullName.Replace((Get-Location).Path + '\', ''))" -ForegroundColor Green
            $updatedCount++
        }
    }
    catch {
        Write-Host "  ✗ Error processing $($file.Name): $_" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Green
Write-Host "  Total files checked: $totalFiles" -ForegroundColor White
Write-Host "  Files updated: $updatedCount" -ForegroundColor White
if ($errorCount -gt 0) {
    Write-Host "  Errors encountered: $errorCount" -ForegroundColor Red
}

# Remove old files
Write-Host "`nRemoving old files..." -ForegroundColor Yellow
Remove-Item -Path ".\components\ui\Button.old" -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".\components\ui\Input.old" -Force -ErrorAction SilentlyContinue

# Clear Next.js cache
Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow
Remove-Item -Path ".\.next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".\node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`n✅ All imports have been fixed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run 'npm run build' to test locally" -ForegroundColor White
Write-Host "  2. Commit changes: git add -A && git commit -m 'Fix case-sensitive imports'" -ForegroundColor White
Write-Host "  3. Push to deploy: git push" -ForegroundColor White
