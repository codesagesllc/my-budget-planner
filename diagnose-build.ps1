Write-Host "Cleaning build cache..." -ForegroundColor Green
Remove-Item -Path .\.next -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path .\node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`nChecking UI component exports..." -ForegroundColor Green
Get-ChildItem -Path ".\components\ui\*.tsx" | ForEach-Object {
    Write-Host "Checking $($_.Name)..." -ForegroundColor Yellow
    $content = Get-Content $_.FullName -Raw
    if ($content -match 'export\s+(const|function|class)\s+(\w+)') {
        Write-Host "  Found export: $($matches[2])" -ForegroundColor Cyan
    }
}

Write-Host "`nChecking TypeScript paths..." -ForegroundColor Green
$tsconfig = Get-Content .\tsconfig.json | ConvertFrom-Json
Write-Host "Base URL: $($tsconfig.compilerOptions.baseUrl)" -ForegroundColor Cyan
Write-Host "Paths: $($tsconfig.compilerOptions.paths | ConvertTo-Json -Compress)" -ForegroundColor Cyan

Write-Host "`nRunning build..." -ForegroundColor Green
npm run build
