@echo off
setlocal
cd /d "%~dp0\..\.."
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required on this Windows laptop. No changes were made.
  pause
  exit /b 1
)
node "%~dp0sign-guided-update.js"
echo.
pause
