param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$TaskName = "Codex Discord RPC Watcher",
  [switch]$RunNow
)

$ErrorActionPreference = "Stop"

$watchScript = Join-Path $ProjectRoot "scripts\watch-codex-rpc.ps1"
if (-not (Test-Path -LiteralPath $watchScript)) {
  throw "Watcher script not found: $watchScript"
}

$powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
$arguments = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", "`"$watchScript`"",
  "-ProjectRoot", "`"$ProjectRoot`""
) -join " "

function Install-StartupShortcut {
  $startupFolder = [Environment]::GetFolderPath("Startup")
  $shortcutPath = Join-Path $startupFolder "$TaskName.lnk"
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $powershell
  $shortcut.Arguments = $arguments
  $shortcut.WorkingDirectory = $ProjectRoot
  $shortcut.WindowStyle = 7
  $shortcut.Description = "Starts Codex Discord RPC whenever Codex is open."
  $shortcut.Save()

  if ($RunNow) {
    Start-Process `
      -FilePath $powershell `
      -ArgumentList $arguments `
      -WorkingDirectory $ProjectRoot `
      -WindowStyle Hidden
  }

  Write-Host "Installed startup shortcut: $shortcutPath"
}

try {
  $action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -MultipleInstances IgnoreNew `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Starts Codex Discord RPC whenever Codex is open." `
    -Force | Out-Null

  if ($RunNow) {
    Start-ScheduledTask -TaskName $TaskName
  }

  Write-Host "Installed scheduled task: $TaskName"
} catch {
  Write-Host "Could not install scheduled task: $($_.Exception.Message)"
  Write-Host "Falling back to the current user's Startup folder."
  Install-StartupShortcut
}

Write-Host "Watcher script: $watchScript"
Write-Host "Logs: $(Join-Path $ProjectRoot ".runtime")"
