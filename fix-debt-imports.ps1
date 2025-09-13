# PowerShell script to fix UI component imports in debt components
Write-Host "Fixing UI component imports in debt components..." -ForegroundColor Green

# Get all TypeScript/TSX files in the debt directory
$debtFiles = Get-ChildItem -Path ".\components\debt\" -Filter "*.tsx" -File

foreach ($file in $debtFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Yellow
    
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Fix Button import - use the index file
    $content = $content -replace "from '@/components/ui/button'", "from '@/components/ui'"
    
    # Fix Input import - use the index file
    $content = $content -replace "from '@/components/ui/input'", "from '@/components/ui'"
    
    # Fix Select import - use the index file
    $content = $content -replace "from '@/components/ui/select'", "from '@/components/ui'"
    
    # Fix Label import - use the index file
    $content = $content -replace "from '@/components/ui/label'", "from '@/components/ui'"
    
    # Fix Card import - use the index file
    $content = $content -replace "from '@/components/ui/card'", "from '@/components/ui'"
    
    # Only write if content changed
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "  ✓ Fixed imports in $($file.Name)" -ForegroundColor Green
    } else {
        Write-Host "  - No changes needed in $($file.Name)" -ForegroundColor Gray
    }
}

Write-Host "`nImport fixes complete!" -ForegroundColor Green
Write-Host "Now running build to verify..." -ForegroundColor Cyan

# Run build to test
npm run build
