# GOOLIX Frontend Build & Deploy Script
$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " GOOLIX: Build React SPA (Windows Host)  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Build React SPA with Vite locally
Set-Location -Path "$PSScriptRoot\..\frontend"
Write-Host "[1/3] Building React application with Vite..." -ForegroundColor Yellow
npm run build

# 2. Sync to root dist directory
Set-Location -Path "$PSScriptRoot\.."
Write-Host "[2/3] Syncing dist to root directory..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}
Copy-Item -Recurse -Force "frontend\dist" "dist"

Write-Host "[3/3] Build finished successfully!" -ForegroundColor Green
Write-Host "Output assets ready in: .\dist" -ForegroundColor Green
Write-Host "Run git push or sync to VPS to update live web interface." -ForegroundColor Cyan
