param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$ClientId,
  [string]$SubscriptionType = "ChatGPT Plus",
  [string]$WorkingOn = "Working with Codex",
  [switch]$OpenDiscordPortal,
  [switch]$RunNow
)

$ErrorActionPreference = "Stop"

$configPath = Join-Path $ProjectRoot "codex-rpc.config.json"
$installScript = Join-Path $ProjectRoot "scripts\install-windows-startup.ps1"

if ($OpenDiscordPortal) {
  Start-Process "https://discord.com/developers/applications"
}

if (-not $ClientId) {
  Write-Host ""
  Write-Host "Discord RPC requires a Discord Application ID."
  Write-Host "This is not a token or password. It only identifies the Rich Presence app shown in Discord."
  Write-Host "Create/copy it at https://discord.com/developers/applications"
  Write-Host ""
  $ClientId = Read-Host "Paste Discord Application ID"
}

if (-not ($ClientId -match "^\d{16,25}$")) {
  throw "Invalid Discord Application ID. It should be a numeric Discord snowflake, usually 17-21 digits."
}

$config = [ordered]@{
  clientId = $ClientId
  subscriptionType = $SubscriptionType
  workingOn = $WorkingOn
  startedAt = (Get-Date).ToString("o")
  largeImageKey = "codex"
  largeImageText = "Codex"
  smallImageText = "Coding with Codex"
}

$json = $config | ConvertTo-Json -Depth 4
$json | Set-Content -LiteralPath $configPath -Encoding UTF8

Write-Host "Saved config: $configPath"

& $installScript -ProjectRoot $ProjectRoot -RunNow:$RunNow

Write-Host ""
Write-Host "Setup complete."
Write-Host "Codex Discord RPC will start automatically after Windows login whenever Codex is open."
