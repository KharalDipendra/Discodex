param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$CodexProcessName = "Codex",
  [int]$PollSeconds = 5
)

$ErrorActionPreference = "Stop"

$runtimeDir = Join-Path $ProjectRoot ".runtime"
$stdoutLog = Join-Path $runtimeDir "codex-discord-rpc.out.log"
$stderrLog = Join-Path $runtimeDir "codex-discord-rpc.err.log"
$configPath = Join-Path $ProjectRoot "codex-rpc.config.json"
$rpcProcess = $null
$lastConfigWarning = $null

function Test-RpcConfigured {
  if ($env:DISCORD_CLIENT_ID -or $env:CODEX_DISCORD_CLIENT_ID) {
    return $true
  }

  if (-not (Test-Path -LiteralPath $configPath)) {
    return $false
  }

  try {
    $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
    return [bool]$config.clientId
  } catch {
    return $false
  }
}

function Test-CodexRunning {
  $processes = Get-Process -Name $CodexProcessName -ErrorAction SilentlyContinue
  return [bool]($processes | Select-Object -First 1)
}

function Get-NpmCommand {
  $command = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  return (Get-Command npm -ErrorAction Stop).Source
}

function Start-Rpc {
  if ($script:rpcProcess -and -not $script:rpcProcess.HasExited) {
    return
  }

  if (-not (Test-RpcConfigured)) {
    $now = Get-Date
    if (-not $script:lastConfigWarning -or (($now - $script:lastConfigWarning).TotalSeconds -gt 60)) {
      New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
      "[$($now.ToString("s"))] Waiting for codex-rpc.config.json with clientId, or DISCORD_CLIENT_ID." |
        Add-Content -LiteralPath $stderrLog
      $script:lastConfigWarning = $now
    }
    return
  }

  New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
  $npmCommand = Get-NpmCommand

  $script:rpcProcess = Start-Process `
    -FilePath $npmCommand `
    -ArgumentList @("start") `
    -WorkingDirectory $ProjectRoot `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog
}

function Stop-Rpc {
  if (-not $script:rpcProcess -or $script:rpcProcess.HasExited) {
    return
  }

  $script:rpcProcess.CloseMainWindow() | Out-Null
  if (-not $script:rpcProcess.WaitForExit(3000)) {
    $script:rpcProcess.Kill()
    $script:rpcProcess.WaitForExit()
  }
}

try {
  while ($true) {
    if (Test-CodexRunning) {
      Start-Rpc
    } else {
      Stop-Rpc
    }

    Start-Sleep -Seconds $PollSeconds
  }
} finally {
  Stop-Rpc
}
