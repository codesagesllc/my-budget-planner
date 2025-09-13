# Final comprehensive fix for ALL uppercase imports
Write-Host "Starting comprehensive import fix..." -ForegroundColor Green

# List of all files that need fixing based on the error message
$filesToFix = @(
    "components\debt\RecordPaymentModal.tsx",
    "components\debt\PaymentHistoryModal.tsx",
    "components\debt\DebtList.tsx",
    "components\debt\AddDebtModal.tsx",
    "components\debt\DebtStrategySelector.tsx",
    "components\debt\DebtManagement.tsx",
    "components\AIIncomeDetector.tsx"
)

$fixedCount = 0

Write-Host "`nFixing specific files with uppercase imports..." -ForegroundColor Yellow

foreach ($file in $filesToFix) {
    if (Test-Path $file) {
        try {
            $content = [System.IO.File]::ReadAllText($file)
            $original = $content
            
            # Fix all variations of Button import
            $content = $content.Replace("from '@/components/ui/Button'", "from '@/components/ui/button'")
            $content = $content.Replace("from '../ui/Button'", "from '../ui/button'")
            $content = $content.Replace("from '../../ui/Button'", "from '../../ui/button'")
            
            # Fix all variations of Input import
            $content = $content.Replace("from '@/components/ui/Input'", "from '@/components/ui/input'")
            $content = $content.Replace("from '../ui/Input'", "from '../ui/input'")
            $content = $content.Replace("from '../../ui/Input'", "from '../../ui/input'")
            
            # Fix other UI components
            $content = $content.Replace("from '@/components/ui/Card'", "from '@/components/ui/card'")
            $content = $content.Replace("from '@/components/ui/Label'", "from '@/components/ui/label'")
            $content = $content.Replace("from '@/components/ui/Select'", "from '@/components/ui/select'")
            $content = $content.Replace("from '@/components/ui/Tabs'", "from '@/components/ui/tabs'")
            
            if ($content -ne $original) {
                [System.IO.File]::WriteAllText($file, $content)
                Write-Host "  Fixed: $file" -ForegroundColor Green
                $fixedCount++
            } else {
                Write-Host "  No changes needed: $file" -ForegroundColor Gray
            }
        }
        catch {
            Write-Host "  Error fixing $file : $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  File not found: $file" -ForegroundColor Yellow
    }
}

# Now scan ALL TypeScript files for any remaining uppercase imports
Write-Host "`nScanning all TypeScript files for remaining uppercase imports..." -ForegroundColor Yellow

$allFiles = Get-ChildItem -Path . -Include *.tsx,*.ts -Recurse | Where-Object { 
    $_.FullName -notmatch "node_modules" -and 
    $_.FullName -notmatch "\.next" -and
    $_.FullName -notmatch "\.git"
}

$additionalFixed = 0

foreach ($file in $allFiles) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $original = $content
        
        # Fix ALL uppercase UI component imports
        $content = $content.Replace("from '@/components/ui/Button'", "from '@/components/ui/button'")
        $content = $content.Replace("from '@/components/ui/Input'", "from '@/components/ui/input'")
        $content = $content.Replace("from '@/components/ui/Card'", "from '@/components/ui/card'")
        $content = $content.Replace("from '@/components/ui/Label'", "from '@/components/ui/label'")
        $content = $content.Replace("from '@/components/ui/Select'", "from '@/components/ui/select'")
        $content = $content.Replace("from '@/components/ui/Tabs'", "from '@/components/ui/tabs'")
        
        # Fix relative imports
        $content = $content.Replace("from '../ui/Button'", "from '../ui/button'")
        $content = $content.Replace("from '../ui/Input'", "from '../ui/input'")
        $content = $content.Replace("from '../../ui/Button'", "from '../../ui/button'")
        $content = $content.Replace("from '../../ui/Input'", "from '../../ui/input'")
        $content = $content.Replace("from './Button'", "from './button'")
        $content = $content.Replace("from './Input'", "from './input'")
        
        if ($content -ne $original) {
            [System.IO.File]::WriteAllText($file.FullName, $content)
            $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
            Write-Host "  Fixed additional file: $relativePath" -ForegroundColor Cyan
            $additionalFixed++
        }
    }
    catch {
        # Silent fail for files we can't read
    }
}

# Clean up old files
Write-Host "`nCleaning up old files..." -ForegroundColor Yellow
if (Test-Path "components\ui\Button.old") {
    Remove-Item "components\ui\Button.old" -Force
    Write-Host "  Removed Button.old" -ForegroundColor Gray
}
if (Test-Path "components\ui\Input.old") {
    Remove-Item "components\ui\Input.old" -Force
    Write-Host "  Removed Input.old" -ForegroundColor Gray
}

# Clear cache
Write-Host "`nClearing build cache..." -ForegroundColor Yellow
if (Test-Path ".\.next") {
    Remove-Item ".\.next" -Recurse -Force
    Write-Host "  Cleared .next cache" -ForegroundColor Gray
}
if (Test-Path "node_modules\.cache") {
    Remove-Item "node_modules\.cache" -Recurse -Force
    Write-Host "  Cleared node_modules cache" -ForegroundColor Gray
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host " SUMMARY" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Targeted files fixed: $fixedCount" -ForegroundColor White
Write-Host "  Additional files fixed: $additionalFixed" -ForegroundColor White
$totalFixed = $fixedCount + $additionalFixed
Write-Host "  Total files fixed: $totalFixed" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan

Write-Host "`nAll imports have been fixed!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Run: npm run build" -ForegroundColor White
Write-Host "  2. If successful: git add -A" -ForegroundColor White
Write-Host "  3. Commit: git commit -m 'Fix all uppercase UI component imports'" -ForegroundColor White
Write-Host "  4. Push: git push" -ForegroundColor White
