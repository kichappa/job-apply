<#
Set up the user's real Edge/Chrome for automation and attach playwright-cli to it.

  init.ps1 [-Browser edge|chrome] [-Relaunch] [-AttachOnly] [-Session job]

1. Checks prerequisites (node, playwright-cli, python, pypdf/openpyxl) and installs the missing npm/pip bits.
2. Finds DevToolsActivePort in the browser's user-data dir. If absent: opens <browser>://inspect/#remote-debugging
   so the user can switch on "Allow remote debugging for this browser instance", then waits for it.
3. -Relaunch: closes the browser and starts it again with flags that keep covered/off-screen windows rendering.
4. Attaches: playwright-cli -s=<session> attach --cdp=ws://localhost:<port><path>  (user clicks "Allow").
#>
param([ValidateSet('edge', 'chrome')][string]$Browser, [switch]$Relaunch, [switch]$AttachOnly, [string]$Session)
$ErrorActionPreference = 'Stop'
$cfgDir = if ($env:JOB_APPLY_HOME) { $env:JOB_APPLY_HOME } else { Join-Path $HOME '.job-apply' }
$cfg = if (Test-Path "$cfgDir/config.json") { Get-Content "$cfgDir/config.json" -Raw | ConvertFrom-Json } else { $null }
if (-not $Browser) { $Browser = if ($cfg -and $cfg.browser.name) { $cfg.browser.name } else { 'edge' } }
if (-not $Session) { $Session = if ($cfg -and $cfg.browser.session) { $cfg.browser.session } else { 'job' } }
$win = $IsWindows -or $PSVersionTable.PSEdition -eq 'Desktop'

if ($win) {
  $udd = if ($Browser -eq 'edge') { "$env:LOCALAPPDATA\Microsoft\Edge\User Data" } else { "$env:LOCALAPPDATA\Google\Chrome\User Data" }
  $exe = if ($Browser -eq 'edge') { @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") }
         else { @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") }
  $exe = $exe | Where-Object { Test-Path $_ } | Select-Object -First 1
  $proc = if ($Browser -eq 'edge') { 'msedge' } else { 'chrome' }
} elseif ($IsMacOS) {
  $udd = if ($Browser -eq 'edge') { "$HOME/Library/Application Support/Microsoft Edge" } else { "$HOME/Library/Application Support/Google/Chrome" }
  $exe = if ($Browser -eq 'edge') { '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge' } else { '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }
  $proc = if ($Browser -eq 'edge') { 'Microsoft Edge' } else { 'Google Chrome' }
} else {
  $udd = if ($Browser -eq 'edge') { "$HOME/.config/microsoft-edge" } else { "$HOME/.config/google-chrome" }
  $exe = if ($Browser -eq 'edge') { 'microsoft-edge' } else { 'google-chrome' }
  $proc = if ($Browser -eq 'edge') { 'msedge' } else { 'chrome' }
}
$portFile = Join-Path $udd 'DevToolsActivePort'

if (-not $AttachOnly) {
  '== prerequisites'
  foreach ($c in 'node', 'npm', 'python', 'git') { if (Get-Command $c -ErrorAction SilentlyContinue) { "ok   $c" } else { "MISSING $c  (install it, then re-run init)" } }
  if (-not (Get-Command playwright-cli -ErrorAction SilentlyContinue)) { 'installing @playwright/cli ...'; npm install -g '@playwright/cli@latest' | Out-Null }
  if (Get-Command playwright-cli -ErrorAction SilentlyContinue) { 'ok   playwright-cli' } else { 'MISSING playwright-cli' }
  if (Get-Command python -ErrorAction SilentlyContinue) {
    & python -c "import pypdf, openpyxl" 2>$null
    if ($LASTEXITCODE -ne 0) { 'installing pypdf openpyxl ...'; & python -m pip install --quiet --user pypdf openpyxl }
    'ok   pypdf, openpyxl'
  }
  if ($PSVersionTable.PSVersion.Major -lt 7) { 'WARN run scripts with pwsh (PowerShell 7); Windows PowerShell 5 lacks APIs the password store uses' }
}

function Test-Port($pf) {
  if (-not (Test-Path $pf)) { return $null }
  $l = Get-Content $pf; $port = [int]$l[0]
  try { $c = [System.Net.Sockets.TcpClient]::new(); $c.Connect('127.0.0.1', $port); $c.Close(); return @{ port = $port; path = $l[1] } } catch { return $null }
}

if ($Relaunch -and $exe) {
  "== relaunching $Browser with rendering flags (tabs restore)"
  Get-Process $proc -ErrorAction SilentlyContinue | ForEach-Object { $_.CloseMainWindow() | Out-Null }
  Start-Sleep 4; Get-Process $proc -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep 2
  Start-Process $exe -ArgumentList '--disable-features=CalculateNativeWinOcclusion', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--restore-last-session'
  Start-Sleep 6
}

$dt = Test-Port $portFile
if (-not $dt) {
  "== remote debugging is OFF. Opening ${Browser}://inspect/#remote-debugging"
  "   -> switch ON 'Allow remote debugging for this browser instance'. Waiting up to 3 min..."
  if ($exe) { Start-Process $exe -ArgumentList "${Browser}://inspect/#remote-debugging" }
  $t0 = Get-Date
  while (-not ($dt = Test-Port $portFile) -and ((Get-Date) - $t0).TotalSeconds -lt 180) { Start-Sleep 3 }
  if (-not $dt) { 'FAILED: DevToolsActivePort never appeared. Turn the toggle on, then run: init.ps1 -AttachOnly'; exit 1 }
}
"== debugging on port $($dt.port). Attaching session '$Session' -> click ALLOW in the browser prompt"
$ws = "ws://localhost:$($dt.port)$($dt.path)"
New-Item -ItemType Directory -Force $cfgDir | Out-Null; Set-Location $cfgDir
& playwright-cli "-s=$Session" attach "--cdp=$ws" 2>&1 | Where-Object { $_ -notmatch '[═║╔╚]' } | Select-Object -First 6
& playwright-cli "-s=$Session" tab-list 2>&1 | Where-Object { $_ -notmatch '[═║╔╚]' } | Select-Object -First 8
'== next: install the Simplify Copilot extension, sign in to Simplify + your mail + job hubs, then /job-apply config'
