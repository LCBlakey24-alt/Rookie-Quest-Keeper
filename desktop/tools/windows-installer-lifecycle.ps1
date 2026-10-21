param(
  [Parameter(Mandatory = $true)][string]$InitialInstaller,
  [Parameter(Mandatory = $true)][string]$NextInstaller,
  [Parameter(Mandatory = $true)][string]$InitialVersion,
  [Parameter(Mandatory = $true)][string]$NextVersion,
  [string]$ReportPath = (Join-Path (Get-Location) 'installer-lifecycle-report.json')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# This tool deliberately runs real per-user NSIS setup/uninstall operations.
# The GitHub-hosted Windows account is disposable. Never run on a real laptop.
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows' -or -not $env:RUNNER_TEMP) {
  throw 'Installer lifecycle tests may run only on a disposable GitHub Windows runner.'
}
if ($InitialVersion -notmatch '^\d+\.\d+\.\d+$' -or $NextVersion -notmatch '^\d+\.\d+\.\d+$') {
  throw 'Expected two stable synthetic QA versions.'
}
if ([version]$NextVersion -le [version]$InitialVersion) { throw 'The QA upgrade must be a newer version.' }
foreach ($file in @($InitialInstaller, $NextInstaller)) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing QA setup: $file" }
}

$ReportPath = [IO.Path]::GetFullPath($ReportPath)
$root = Join-Path $env:RUNNER_TEMP ('Keeper Installer Lifecycle ' + [guid]::NewGuid().ToString('N'))
$installation = Join-Path $root 'Rookie Quest Keeper'
$profileRoot = Join-Path $root 'Disposable App Profile'
New-Item -ItemType Directory -Path $profileRoot -Force | Out-Null
Set-Content -LiteralPath (Join-Path $profileRoot '.keeper-disposable-installer-profile') -Value 'Synthetic GitHub runner test only'
$executable = Join-Path $installation 'Rookie Quest Keeper.exe'
$smoke = Join-Path $PSScriptRoot 'packaged-startup-smoke.cjs'
$desktopLink = Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'Rookie Quest Keeper.lnk'
$startMenuLink = Join-Path ([Environment]::GetFolderPath('Programs')) 'Rookie Quest Keeper.lnk'
$report = [ordered]@{
  scope = 'Unsigned QA setup mechanics on disposable GitHub Windows runner; not signed-updater validation'
  initial_version = $InitialVersion
  synthetic_upgrade_version = $NextVersion
  events = @()
}
$originalSmokeReport = $env:RQK_PACKAGED_SMOKE_REPORT
$originalExpectedVersion = $env:RQK_QA_EXPECTED_VERSION
$defaultProfileSentinels = @()

function Record([string]$Stage, [object]$Detail = $null) {
  $report.events += [ordered]@{ stage = $Stage; detail = $Detail }
  $report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $ReportPath -Encoding utf8
}

function Wait-Until([scriptblock]$Condition, [string]$Description) {
  $deadline = [DateTime]::UtcNow.AddSeconds(40)
  do {
    if (& $Condition) { return }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)
  throw "Timed out: $Description"
}

function Run-Setup([string]$Setup, [string]$Version) {
  # /D is last and intentionally unquoted as required by NSIS command syntax.
  # The assisted NSIS template starts an app during /S only with --force-run;
  # this trial intentionally omits that flag and launches isolated profiles itself.
  $process = Start-Process -FilePath $Setup -ArgumentList "/S /currentuser /D=$installation" -Wait -PassThru
  if ($process.ExitCode -ne 0) { throw "NSIS setup failed with exit code $($process.ExitCode)." }
  Wait-Until { Test-Path -LiteralPath $executable -PathType Leaf } 'installed application executable'
  $installedVersion = (Get-Item -LiteralPath $executable).VersionInfo.ProductVersion
  if ($installedVersion -ne $Version) { throw "Installed payload version is $installedVersion; expected $Version." }
  $unexpected = @(Get-Process -Name 'Rookie Quest Keeper' -ErrorAction SilentlyContinue)
  if ($unexpected.Count -gt 0) { throw 'Silent setup unexpectedly launched Keeper outside the isolated profile.' }
  Record 'installed-payload-version-verified' $Version
}

function Check-Shortcuts {
  $shell = New-Object -ComObject WScript.Shell
  try {
    foreach ($shortcut in @($desktopLink, $startMenuLink)) {
      if (-not (Test-Path -LiteralPath $shortcut -PathType Leaf)) { throw "Missing installed shortcut: $shortcut" }
      $link = $shell.CreateShortcut($shortcut)
      if ([IO.Path]::GetFullPath($link.TargetPath) -ine [IO.Path]::GetFullPath($executable)) {
        throw 'An installed shortcut targets the wrong application.'
      }
    }
  } finally {
    [Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null
  }
  Record 'desktop-and-start-menu-shortcuts-verified'
}

function Run-Smoke([string]$Mode, [string]$Stage) {
  $env:RQK_PACKAGED_SMOKE_REPORT = Join-Path ([IO.Path]::GetDirectoryName($ReportPath)) "installer-lifecycle-$Stage.json"
  $env:RQK_QA_EXPECTED_VERSION = (Get-Item -LiteralPath $executable).VersionInfo.ProductVersion
  & node $smoke $executable $Mode $profileRoot
  if ($LASTEXITCODE -ne 0) { throw "Installed offline application/data verification failed at $Stage." }
  Record $Stage
}

function Media-Hashes {
  $backupRoots = @(Get-ChildItem -LiteralPath $profileRoot -Directory -Recurse -Filter 'workspace-backups')
  if ($backupRoots.Count -ne 1) { throw 'Expected one disposable native user-data folder.' }
  $mediaRoot = Join-Path $backupRoots[0].Parent.FullName 'campaign-packs'
  $hashes = [ordered]@{}
  foreach ($file in @(Get-ChildItem -LiteralPath $mediaRoot -File -Recurse | Sort-Object FullName)) {
    $relative = [IO.Path]::GetRelativePath($mediaRoot, $file.FullName)
    $hashes[$relative] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
  }
  if ($hashes.Count -lt 2) { throw 'Missing synthetic map/music files.' }
  return ($hashes | ConvertTo-Json -Compress)
}

function Run-Uninstall {
  $uninstallers = @(Get-ChildItem -LiteralPath $installation -Filter '*Uninstall*.exe' -File)
  if ($uninstallers.Count -ne 1) { throw 'Expected exactly one installed Keeper uninstaller.' }
  # _?= keeps NSIS in this process so -Wait observes actual completion.
  $process = Start-Process -FilePath $uninstallers[0].FullName -ArgumentList "/S /currentuser _?=$installation" -Wait -PassThru
  if ($process.ExitCode -ne 0) { throw "NSIS uninstall failed with exit code $($process.ExitCode)." }
  Wait-Until { -not (Test-Path -LiteralPath $executable) } 'application removal after uninstall'
  foreach ($shortcut in @($desktopLink, $startMenuLink)) {
    if (Test-Path -LiteralPath $shortcut) { throw 'Uninstall did not remove its application shortcuts.' }
  }
  foreach ($sentinel in $defaultProfileSentinels) {
    if (-not (Test-Path -LiteralPath $sentinel -PathType Leaf)) {
      throw 'Uninstall deleted the default application-data preservation sentinel.'
    }
  }
  Record 'uninstaller-removed-app-and-shortcuts'
}

try {
  # Refuse an unexpected pre-existing application, even on a runner.
  if ((Test-Path -LiteralPath $desktopLink) -or (Test-Path -LiteralPath $startMenuLink)) {
    throw 'The runner already has a Keeper installation/shortcut; refusing to overwrite it.'
  }
  # The real app session remains isolated under RUNNER_TEMP. These two tiny
  # sentinels additionally exercise NSIS's actual default-AppData deletion
  # paths, so a deleteAppDataOnUninstall regression cannot hide behind the
  # custom test profile. Both folders must be absent before this runner test.
  $package = Get-Content (Join-Path $PSScriptRoot '../package.json') -Raw | ConvertFrom-Json
  $defaultDataNames = @($package.name, $package.build.productName) | Select-Object -Unique
  foreach ($name in $defaultDataNames) {
    $directory = Join-Path ([Environment]::GetFolderPath('ApplicationData')) $name
    if (Test-Path -LiteralPath $directory) { throw 'The runner already has Keeper app data; refusing to touch it.' }
    New-Item -ItemType Directory -Path $directory | Out-Null
    $sentinel = Join-Path $directory 'keeper-uninstall-preservation-sentinel.txt'
    Set-Content -LiteralPath $sentinel -Value 'Synthetic disposable-runner preservation fixture'
    $defaultProfileSentinels += $sentinel
  }
  Record 'disposable-windows-installer-trial-started'
  Run-Setup $InitialInstaller $InitialVersion
  Check-Shortcuts
  Run-Smoke 'seed' 'initial-install-offline-startup-and-native-backup-restore'
  $before = Media-Hashes

  Run-Setup $NextInstaller $NextVersion
  Check-Shortcuts
  Run-Smoke 'check' 'upgrade-preserved-workspace-browser-state-media-and-offline-startup'
  if ((Media-Hashes) -cne $before) { throw 'Imported-media hashes changed across the NSIS upgrade.' }
  Record 'upgrade-media-hashes-identical'

  Run-Uninstall
  if ((Media-Hashes) -cne $before) { throw 'Uninstall removed or changed imported campaign media.' }
  Record 'uninstall-retained-profile-and-media'

  # Recovery uses the prior reviewed setup AFTER uninstall. It neither bypasses
  # updater signatures nor requests an unsupported in-place downgrade.
  Run-Setup $InitialInstaller $InitialVersion
  Check-Shortcuts
  Run-Smoke 'check' 'previous-installer-recovery-preserved-workspace-browser-state-media'
  if ((Media-Hashes) -cne $before) { throw 'Imported-media hashes changed during installer recovery.' }
  Record 'previous-installer-recovery-media-hashes-identical'
  Run-Uninstall
  Record 'passed'
} catch {
  Record 'failed' $_.Exception.ToString()
  throw
} finally {
  $env:RQK_PACKAGED_SMOKE_REPORT = $originalSmokeReport
  $env:RQK_QA_EXPECTED_VERSION = $originalExpectedVersion
  if (Test-Path -LiteralPath $executable) {
    try { Run-Uninstall } catch { Write-Warning 'Disposable QA cleanup could not finish uninstalling. See trial report.' }
  }
  foreach ($sentinel in $defaultProfileSentinels) {
    Remove-Item -LiteralPath $sentinel -Force -ErrorAction SilentlyContinue
    $directory = Split-Path -Parent $sentinel
    if ((Test-Path -LiteralPath $directory) -and @(Get-ChildItem -LiteralPath $directory -Force).Count -eq 0) {
      Remove-Item -LiteralPath $directory -Force
    }
  }
  Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
}
