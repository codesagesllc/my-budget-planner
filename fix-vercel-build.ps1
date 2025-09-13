# Fix Vercel Build Issues Script
Write-Host "Fixing Vercel deployment issues..." -ForegroundColor Green

# 1. Update next.config.mjs to force cache invalidation
Write-Host "Updating Next.js configuration..." -ForegroundColor Yellow
$nextConfig = @'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Force clean build on Vercel
  generateBuildId: async () => {
    return Date.now().toString()
  },
  
  // Image configuration for Next.js 15
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
    ],
  },
  
  // Ensure TypeScript paths work correctly
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Webpack customization
  webpack: (config) => {
    // Ensure proper module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    }
    
    // Ensure @ alias works correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': process.cwd(),
    }
    
    return config
  },
}

export default nextConfig
'@
Set-Content -Path "next.config.mjs" -Value $nextConfig

# 2. Update vercel.json to ensure proper build
Write-Host "Updating Vercel configuration..." -ForegroundColor Yellow
$vercelConfig = @'
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install --force",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key",
    "PLAID_CLIENT_ID": "@plaid_client_id",
    "PLAID_SECRET": "@plaid_secret",
    "PLAID_ENV": "@plaid_env",
    "PLAID_PRODUCTS": "@plaid_products",
    "PLAID_COUNTRY_CODES": "@plaid_country_codes",
    "ANTHROPIC_API_KEY": "@anthropic_api_key",
    "NEXT_PUBLIC_APP_URL": "@app_url"
  },
  "regions": ["iad1"],
  "functions": {
    "app/api/bills/upload/route.ts": {
      "maxDuration": 30
    },
    "app/api/insights/generate/route.ts": {
      "maxDuration": 30
    },
    "app/api/plaid/exchange-token/route.ts": {
      "maxDuration": 30
    }
  },
  "ignoreCommand": "exit 1"
}
'@
Set-Content -Path "vercel.json" -Value $vercelConfig

# 3. Create a .vercelignore file to exclude unnecessary files
Write-Host "Creating .vercelignore..." -ForegroundColor Yellow
$vercelIgnore = @'
.git
.next
node_modules
*.ps1
*.sh
*.bat
.env.local
.env
*.log
docs
scripts/*.ps1
scripts/*.sh
fix-*.ps1
fix-*.sh
'@
Set-Content -Path ".vercelignore" -Value $vercelIgnore

# 4. Clear Next.js cache
Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force
}

# 5. Clear node_modules and reinstall
Write-Host "Reinstalling dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Path "node_modules" -Recurse -Force
}
if (Test-Path "package-lock.json") {
    Remove-Item -Path "package-lock.json" -Force
}
npm install

# 6. Run a local build to verify
Write-Host "Running local build test..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful! Ready to deploy." -ForegroundColor Green
    
    # 7. Commit and push changes
    Write-Host "Committing changes..." -ForegroundColor Yellow
    git add -A
    git commit -m "Fix Vercel deployment - clear cache and update configs"
    
    Write-Host "Pushing to GitHub to trigger deployment..." -ForegroundColor Yellow
    git push origin main
    
    Write-Host "Deployment triggered! Check Vercel dashboard for status." -ForegroundColor Green
    Write-Host "Visit: https://vercel.com/code-sages/my-budget-planner" -ForegroundColor Cyan
} else {
    Write-Host "Build failed locally. Please check the errors above." -ForegroundColor Red
}
