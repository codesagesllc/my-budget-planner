Write-Host "Testing Module Resolution..." -ForegroundColor Green
Write-Host ""

# Test TypeScript compilation for specific files
Write-Host "Testing hooks/useAuth.ts..." -ForegroundColor Yellow
npx tsc --noEmit hooks/useAuth.ts 2>&1 | Select-String -Pattern "error"

Write-Host "Testing lib/supabase/client.ts..." -ForegroundColor Yellow
npx tsc --noEmit lib/supabase/client.ts 2>&1 | Select-String -Pattern "error"

Write-Host "Testing components/ui/index.ts..." -ForegroundColor Yellow
npx tsc --noEmit components/ui/index.ts 2>&1 | Select-String -Pattern "error"

Write-Host ""
Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow
Remove-Item -Path .\.next -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Running build..." -ForegroundColor Green
npm run build
