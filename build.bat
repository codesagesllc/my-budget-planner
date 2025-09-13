@echo off

echo Building My Budget Planner...
echo ================================

REM Clean previous build
echo Cleaning previous build...
if exist .next rd /s /q .next

REM Type check
echo Running type check...
call npm run type-check
if %errorlevel% neq 0 (
  echo Type check failed!
  exit /b 1
)

echo Type check passed!

REM Build
echo Building application...
call npm run build
if %errorlevel% neq 0 (
  echo Build failed!
  exit /b 1
)

echo Build completed successfully!
echo ================================
echo Application is ready for deployment!
