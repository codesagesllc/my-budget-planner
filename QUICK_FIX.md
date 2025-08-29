# Quick Fix for Windows PowerShell

## Run these PowerShell commands:

```powershell
# 1. Clean old dependencies (PowerShell compatible)
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path package-lock.json -Force -ErrorAction SilentlyContinue

# 2. Clear npm cache
npm cache clean --force

# 3. Install with legacy peer deps (for React 19 compatibility)
npm install --legacy-peer-deps

# 4. Fix remaining vulnerabilities
npm audit fix --legacy-peer-deps
```

## Or use these simpler commands:

```powershell
# Delete folders/files
if (Test-Path node_modules) { Remove-Item node_modules -Recurse -Force }
if (Test-Path package-lock.json) { Remove-Item package-lock.json -Force }

# Install
npm install --legacy-peer-deps
```

## After installation, run:
```powershell
npm run dev
```
