param(
  [string]$RepoPath = "C:\Users\ART\Desktop\One Add\tgmg",
  [string]$AppPath = "C:\Users\ART\Desktop\One Add\tgmg\apps\mobile",
  [string]$PackageName = "com.tgmg.app"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Mobile Dev Reset (single-workspace) ==="
Write-Host "RepoPath: $RepoPath"
Write-Host "AppPath:  $AppPath"

if (!(Test-Path $RepoPath)) { throw "RepoPath not found: $RepoPath" }
if (!(Test-Path $AppPath)) { throw "AppPath not found: $AppPath" }

Set-Location $RepoPath

Write-Host "1) Kill Node/Metro processes"
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "2) Clear Expo/Metro cache folders"
Remove-Item -Recurse -Force "$env:TEMP\metro-cache" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:TEMP\haste-map-*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$AppPath\.expo" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$AppPath\.metro-cache" -ErrorAction SilentlyContinue

Write-Host "3) Reinstall workspace deps"
pnpm install

Write-Host "4) Check React single version"
pnpm why react

Write-Host "5) Reset ADB reverse and relaunch app"
adb kill-server
adb start-server
adb reverse --remove-all
adb reverse tcp:8081 tcp:8081
adb shell am force-stop $PackageName

Write-Host "=== Done. Start Metro with: ==="
Write-Host "cd `"$AppPath`""
Write-Host "npx expo start --dev-client --clear"
