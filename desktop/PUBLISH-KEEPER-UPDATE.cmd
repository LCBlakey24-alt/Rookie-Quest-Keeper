@echo off
setlocal DisableDelayedExpansion
title Rookie Quest Keeper - Signed Update Publisher
echo.
echo Rookie Quest Keeper - publish a signed Windows update to OneDrive
echo ---------------------------------------------------------------
echo ONLY use this on your own Windows laptop, with a reviewed GitHub
echo Keeper-Application-For-Signing build. Your signing key stays local.
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not in PATH. No files were changed.
  pause
  exit /b 1
)
set /p "RQK_VERSION=New version (example 0.4.4): "
set /p "RQK_SIGNING_KEY=Full path to your protected Windows signing key file: "
set /p "RQK_UPDATES_DIR=Full path to OneDrive Updates\Program Updates folder: "
echo.
echo This will sign version %RQK_VERSION% and create a NEW version folder
echo under Program Updates. It will not alter your app or campaign data.
choice /M "Continue with LOCAL signing"
if errorlevel 2 (
  echo Cancelled; no release published.
  pause
  exit /b 0
)
node "%~dp0tools\publish-signed-program.js" "%RQK_VERSION%" "%RQK_SIGNING_KEY%" "%RQK_UPDATES_DIR%" "%~dp0"
if errorlevel 1 (
  echo.
  echo Update was NOT published. Check the error above.
  pause
  exit /b 1
)
echo.
echo After OneDrive has green ticks on ALL package files,
echo install the .rqkprogram in Keeper, through Updates ^& Backups.
pause
