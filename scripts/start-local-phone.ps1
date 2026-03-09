$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$asciiProject = "E:\miniapp_smoke"
$configPath = Join-Path $root "miniprogram\config.js"
$configText = Get-Content -Raw $configPath
$apiBaseMatch = [regex]::Match($configText, "apiBaseUrl:\s*[""'](?<url>[^""']+)[""']")
$apiBaseUrl = if ($apiBaseMatch.Success) { $apiBaseMatch.Groups["url"].Value } else { "http://127.0.0.1:3100/api" }
$serverHealth = ($apiBaseUrl -replace "/api/?$", "") + "/health"
$cliCandidateRoots = @(
  "C:\Program Files (x86)\Tencent",
  "C:\Program Files\Tencent"
) | Where-Object { Test-Path $_ }
$cliItem = $null
foreach ($rootPath in $cliCandidateRoots) {
  $cliItem = Get-ChildItem -Path $rootPath -Filter "cli.bat" -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($cliItem) { break }
}
$cliPath = if ($cliItem) { $cliItem.FullName } else { "" }

Write-Host "[local-phone] Workspace: $root"

if (-not (Test-Path $asciiProject)) {
  cmd /c mklink /J $asciiProject $root | Out-Null
}

$existing = Get-NetTCPConnection -State Listen -LocalPort 3100 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique

if (-not $existing) {
  Write-Host "[local-phone] Starting mock server on port 3100..."
  Start-Process -FilePath "npm.cmd" -ArgumentList "run","start:server" -WorkingDirectory $root -WindowStyle Hidden | Out-Null
  Start-Sleep -Seconds 3
} else {
  Write-Host "[local-phone] Mock server already listening on port 3100."
}

try {
  $health = Invoke-WebRequest -UseBasicParsing $serverHealth -TimeoutSec 5
  Write-Host "[local-phone] Health check ok: $($health.Content)"
} catch {
  Write-Warning "[local-phone] Health check failed. If phone cannot load data, keep this terminal output and tell me."
}

if ($cliPath -and (Test-Path $cliPath)) {
  Write-Host "[local-phone] Opening WeChat DevTools project..."
  Start-Process -FilePath "cmd.exe" -ArgumentList "/c","`"$cliPath`"","open","--project","`"$asciiProject`"","--disable-gpu" | Out-Null
} else {
  Write-Warning "[local-phone] WeChat DevTools CLI not found automatically. Open DevTools manually and import $asciiProject"
}

Write-Host ""
Write-Host "[local-phone] Ready."
Write-Host "1. Keep this computer and server running."
Write-Host "2. In WeChat DevTools, open the imported project if not already visible."
Write-Host "3. Use 真机调试 and scan with the phone on the same Wi-Fi."
