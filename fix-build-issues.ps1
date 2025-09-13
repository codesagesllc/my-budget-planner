# PowerShell script to fix all build issues
Write-Host "Fixing all build issues..." -ForegroundColor Green

# Fix 1: Update LoginForm.tsx imports
Write-Host "`nFixing LoginForm imports..." -ForegroundColor Yellow
$loginFormPath = "app\(auth)\login\LoginForm.tsx"
if (Test-Path $loginFormPath) {
    $content = [System.IO.File]::ReadAllText($loginFormPath)
    $content = $content.Replace("from '@/components/ui/Button'", "from '@/components/ui/button'")
    $content = $content.Replace("from '@/components/ui/Input'", "from '@/components/ui/input'")
    [System.IO.File]::WriteAllText($loginFormPath, $content)
    Write-Host "  Fixed: LoginForm.tsx" -ForegroundColor Green
}

# Fix 2: Update route.ts for Next.js 15 (async params)
Write-Host "`nFixing route handler for Next.js 15..." -ForegroundColor Yellow
$routePath = "app\api\bills\[id]\route.ts"
if (Test-Path $routePath) {
    $content = [System.IO.File]::ReadAllText($routePath)
    
    # Update PUT function signature
    $content = $content.Replace(
        "export async function PUT(`n  request: NextRequest,`n  { params }: { params: { id: string } }`n)",
        "export async function PUT(`n  request: NextRequest,`n  { params }: { params: Promise<{ id: string }> }`n)"
    )
    
    # Update DELETE function signature
    $content = $content.Replace(
        "export async function DELETE(`n  request: NextRequest,`n  { params }: { params: { id: string } }`n)",
        "export async function DELETE(`n  request: NextRequest,`n  { params }: { params: Promise<{ id: string }> }`n)"
    )
    
    # Add await for params access in PUT
    $content = $content.Replace(
        "const billId = params.id",
        "const { id: billId } = await params"
    )
    
    # Add await for params access in DELETE (first occurrence)
    $deletePattern = "try {`n    const billId = params.id"
    $deleteReplace = "try {`n    const { id: billId } = await params"
    $content = $content.Replace($deletePattern, $deleteReplace)
    
    [System.IO.File]::WriteAllText($routePath, $content)
    Write-Host "  Fixed: route.ts" -ForegroundColor Green
}

# Fix 3: Check for any other uppercase imports in auth folder
Write-Host "`nChecking other auth files..." -ForegroundColor Yellow
$authFiles = Get-ChildItem -Path "app\(auth)" -Include *.tsx,*.ts -Recurse -ErrorAction SilentlyContinue

foreach ($file in $authFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    
    $content = $content.Replace("from '@/components/ui/Button'", "from '@/components/ui/button'")
    $content = $content.Replace("from '@/components/ui/Input'", "from '@/components/ui/input'")
    $content = $content.Replace("from '../ui/Button'", "from '../ui/button'")
    $content = $content.Replace("from '../ui/Input'", "from '../ui/input'")
    
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Host "  Fixed: $($file.Name)" -ForegroundColor Green
    }
}

# Clean up
Write-Host "`nCleaning up..." -ForegroundColor Yellow
Remove-Item -Path "components\ui\Button.old" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "components\ui\Input.old" -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".\.next" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`n✅ All fixes applied!" -ForegroundColor Green
Write-Host "`nRun 'npm run build' to test the fixes" -ForegroundColor Yellow