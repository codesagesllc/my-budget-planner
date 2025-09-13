# PowerShell script to fix all case-sensitive imports for Vercel deployment

Write-Host "Fixing case-sensitive imports for Vercel deployment..." -ForegroundColor Green

# Remove old uppercase files
Write-Host "Removing old Button.old and Input.old files..." -ForegroundColor Yellow
Remove-Item -Path ".\components\ui\Button.old" -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".\components\ui\Input.old" -Force -ErrorAction SilentlyContinue

# Get all TypeScript and JavaScript files
$files = Get-ChildItem -Path . -Include *.tsx,*.ts,*.jsx,*.js -Recurse | Where-Object { 
    $_.FullName -notmatch "node_modules" -and 
    $_.FullName -notmatch "\.next" -and
    $_.FullName -notmatch "\.git"
}

$totalFiles = $files.Count
$updatedCount = 0

Write-Host "Checking $totalFiles files for import issues..." -ForegroundColor Yellow

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if ($null -eq $content) { continue }
        
        $originalContent = $content
        
        # Fix all possible import variations
        $content = $content -replace "from\s+['""]@/components/ui/Button['""]", "from '@/components/ui/button'"
        $content = $content -replace "from\s+['""]@/components/ui/Input['""]", "from '@/components/ui/input'"
        $content = $content -replace "from\s+['""]@/components/ui/Alert['""]", "from '@/components/ui/Alert'"
        $content = $content -replace "from\s+['""]@/components/ui/Card['""]", "from '@/components/ui/card'"
        $content = $content -replace "from\s+['""]@/components/ui/Label['""]", "from '@/components/ui/label'"
        $content = $content -replace "from\s+['""]@/components/ui/Select['""]", "from '@/components/ui/select'"
        $content = $content -replace "from\s+['""]@/components/ui/Tabs['""]", "from '@/components/ui/tabs'"
        
        # Fix relative imports
        $content = $content -replace "from\s+['""]\.\.?/ui/Button['""]", "from '../ui/button'"
        $content = $content -replace "from\s+['""]\.\.?/ui/Input['""]", "from '../ui/input'"
        $content = $content -replace "from\s+['""]\.\.?/components/ui/Button['""]", "from '../components/ui/button'"
        $content = $content -replace "from\s+['""]\.\.?/components/ui/Input['""]", "from '../components/ui/input'"
        
        # Fix direct imports
        $content = $content -replace "from\s+['""]./Button['""]", "from './button'"
        $content = $content -replace "from\s+['""]./Input['""]", "from './input'"
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "  Updated: $($file.Name)" -ForegroundColor Gray
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

# Clear Next.js cache
Write-Host "`nClearing Next.js cache..." -ForegroundColor Yellow
Remove-Item -Path ".\.next" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`nImport fixes complete!" -ForegroundColor Green
Write-Host "You can now deploy to Vercel without case-sensitivity issues." -ForegroundColor Green
