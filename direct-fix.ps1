# Direct fix for each problem file
Write-Host "Directly fixing each problem file..." -ForegroundColor Green

# Define the specific files from the error message
$problemFiles = @{
    "components\debt\RecordPaymentModal.tsx" = $true
    "components\debt\PaymentHistoryModal.tsx" = $true
    "components\debt\DebtList.tsx" = $true
    "components\debt\AddDebtModal.tsx" = $true
    "components\debt\DebtStrategySelector.tsx" = $true
    "components\debt\DebtManagement.tsx" = $true
    "components\AIIncomeDetector.tsx" = $true
}

$fixedCount = 0

foreach ($file in $problemFiles.Keys) {
    Write-Host "`nProcessing: $file" -ForegroundColor Yellow
    
    if (Test-Path $file) {
        try {
            # Read the file
            $lines = Get-Content $file
            $newLines = @()
            $changed = $false
            
            foreach ($line in $lines) {
                $newLine = $line
                
                # Check if this line has an import we need to fix
                if ($line -match "from\s+['""].*ui/Button['""]") {
                    $newLine = $line -replace "ui/Button", "ui/button"
                    Write-Host "  Fixed Button import" -ForegroundColor Green
                    $changed = $true
                }
                if ($line -match "from\s+['""].*ui/Input['""]") {
                    $newLine = $line -replace "ui/Input", "ui/input"
                    Write-Host "  Fixed Input import" -ForegroundColor Green
                    $changed = $true
                }
                if ($line -match "from\s+['""].*ui/Card['""]") {
                    $newLine = $line -replace "ui/Card", "ui/card"
                    Write-Host "  Fixed Card import" -ForegroundColor Green
                    $changed = $true
                }
                if ($line -match "from\s+['""].*ui/Label['""]") {
                    $newLine = $line -replace "ui/Label", "ui/label"
                    Write-Host "  Fixed Label import" -ForegroundColor Green
                    $changed = $true
                }
                if ($line -match "from\s+['""].*ui/Select['""]") {
                    $newLine = $line -replace "ui/Select", "ui/select"
                    Write-Host "  Fixed Select import" -ForegroundColor Green
                    $changed = $true
                }
                if ($line -match "from\s+['""].*ui/Tabs['""]") {
                    $newLine = $line -replace "ui/Tabs", "ui/tabs"
                    Write-Host "  Fixed Tabs import" -ForegroundColor Green
                    $changed = $true
                }
                
                $newLines += $newLine
            }
            
            if ($changed) {
                # Write the file back
                Set-Content -Path $file -Value $newLines -Encoding UTF8
                Write-Host "  File updated successfully" -ForegroundColor Green
                $fixedCount++
            } else {
                Write-Host "  No changes needed" -ForegroundColor Gray
            }
        }
        catch {
            Write-Host "  Error: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  File not found!" -ForegroundColor Red
    }
}

# Also check the dashboard-client.tsx which is importing DebtManagement
$dashboardFile = "app\dashboard\dashboard-client.tsx"
if (Test-Path $dashboardFile) {
    Write-Host "`nChecking dashboard-client.tsx..." -ForegroundColor Yellow
    $content = Get-Content $dashboardFile -Raw
    $original = $content
    
    $content = $content -replace "ui/Button", "ui/button"
    $content = $content -replace "ui/Input", "ui/input"
    
    if ($content -ne $original) {
        Set-Content -Path $dashboardFile -Value $content -Encoding UTF8
        Write-Host "  Fixed dashboard-client.tsx" -ForegroundColor Green
    }
}

# Clear caches
Write-Host "`nClearing caches..." -ForegroundColor Yellow
Remove-Item -Path ".\.next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "components\ui\*.old" -Force -ErrorAction SilentlyContinue

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Fixed $fixedCount files" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan

Write-Host "`nNow run: npm run build" -ForegroundColor Yellow
