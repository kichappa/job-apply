<#
Run a CDP/Playwright script from scripts/ against the attached browser, with placeholder substitution.

  run.ps1 cdp/newwin.js -Vars @{URL='https://...'}
  run.ps1 cdp/wd-signin.tmpl.js -PwSite intel          # __PW__ <- DPAPI secret (created if missing)
  run.ps1 cdp/wd-signin.tmpl.js -PwSite intel -Vars @{EMAIL='me@x.edu'}

Placeholders are __NAME__ and are replaced with a JSON-encoded string, so templates write
`const url = __URL__;`. __EMAIL__ defaults to config.account_email, __MAIL__ to config.mail_url. The temp file holding a password
is deleted right after the run and the password is masked in the output.
#>
param(
  [Parameter(Mandatory)][string]$Script,
  [hashtable]$Vars = @{},
  [string]$PwSite,
  [string]$Session
)
$ErrorActionPreference = 'Stop'
$skill = Split-Path $PSScriptRoot -Parent
$cfgDir = if ($env:JOB_APPLY_HOME) { $env:JOB_APPLY_HOME } else { Join-Path $HOME '.job-apply' }
$cfg = $null
if (Test-Path "$cfgDir/config.json") { $cfg = Get-Content "$cfgDir/config.json" -Raw | ConvertFrom-Json }
if (-not $Session) { $Session = if ($cfg -and $cfg.browser.session) { $cfg.browser.session } else { 'job' } }
if (-not $Vars.ContainsKey('EMAIL') -and $cfg -and $cfg.account_email) { $Vars['EMAIL'] = $cfg.account_email }
if (-not $Vars.ContainsKey('MAIL')) { $Vars['MAIL'] = if ($cfg -and $cfg.mail_url) { $cfg.mail_url } else { 'https://outlook.cloud.microsoft/mail/' } }

$path = if (Test-Path $Script) { $Script } else { Join-Path $PSScriptRoot $Script }
$src = Get-Content $path -Raw
foreach ($k in $Vars.Keys) { $src = $src.Replace("__${k}__", ($Vars[$k] | ConvertTo-Json -Compress)) }

$pw = $null
if ($PwSite) {
  if (-not $IsWindows -and $PSVersionTable.PSEdition -eq 'Core') { throw 'Password store uses Windows DPAPI; on macOS/Linux store passwords in the browser manager instead.' }
  $dir = Join-Path $cfgDir 'creds'; New-Item -ItemType Directory -Force $dir | Out-Null
  $f = Join-Path $dir "$PwSite.dpapi"
  if (-not (Test-Path $f)) {
    $chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%*-_'
    do { $pw = -join (1..18 | ForEach-Object { $chars[[System.Security.Cryptography.RandomNumberGenerator]::GetInt32($chars.Length)] }) }
    until ($pw -cmatch '[a-z]' -and $pw -cmatch '[A-Z]' -and $pw -match '\d' -and $pw -match '[!@#$%*_-]')
    ConvertTo-SecureString $pw -AsPlainText -Force | ConvertFrom-SecureString | Set-Content $f
    Write-Output "created new credential for $PwSite (reveal later: scripts/showcreds.ps1)"
  } else { Write-Output "using existing credential for $PwSite" }
  $pw = [System.Net.NetworkCredential]::new('', (Get-Content $f | ConvertTo-SecureString)).Password
  $src = $src.Replace('__PW__', ($pw | ConvertTo-Json))
}

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("ja_" + [guid]::NewGuid().ToString('N') + '.js')
try {
  Set-Content -Path $tmp -Value $src -Encoding utf8
  New-Item -ItemType Directory -Force $cfgDir | Out-Null; Push-Location $cfgDir   # stable cwd for playwright-cli state
  $out = & playwright-cli "-s=$Session" --raw run-code "--filename=$tmp" 2>&1 | Out-String
  if ($pw) { $out = $out.Replace($pw, '***') }
  $out -split "`n" | Where-Object { $_ -notmatch '[═║╔╚]' } | ForEach-Object { $_ }
} finally { Pop-Location -ErrorAction SilentlyContinue; Remove-Item $tmp -ErrorAction SilentlyContinue }
