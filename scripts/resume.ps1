<#
Find "the resume" = newest PDF in config.resume_dir (recursive), print its path, and extract its text to
<config dir>/resume.txt (pypdf, else pdftotext).   resume.ps1 [-Dir <folder>] [-Quiet]
#>
param([string]$Dir, [switch]$Quiet)
$cfgDir = if ($env:JOB_APPLY_HOME) { $env:JOB_APPLY_HOME } else { Join-Path $HOME '.job-apply' }
if (-not $Dir) {
  if (-not (Test-Path "$cfgDir/config.json")) { throw "No config. Run /job-apply config first." }
  $cfg = Get-Content "$cfgDir/config.json" -Raw | ConvertFrom-Json
  $Dir = [Environment]::ExpandEnvironmentVariables($cfg.resume_dir)
  $glob = if ($cfg.resume_glob) { $cfg.resume_glob } else { '*.pdf' }
} else { $glob = '*.pdf' }
$pdf = Get-ChildItem -Path $Dir -Filter $glob -Recurse -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $pdf) { throw "No PDF matching $glob under $Dir" }
"RESUME: $($pdf.FullName)"
"MODIFIED: $($pdf.LastWriteTime.ToString('yyyy-MM-dd HH:mm'))"
New-Item -ItemType Directory -Force $cfgDir | Out-Null
$txt = Join-Path $cfgDir 'resume.txt'
$py = "import sys,pypdf;print('\n'.join((p.extract_text() or '') for p in pypdf.PdfReader(sys.argv[1]).pages))"
$text = & python -c $py $pdf.FullName 2>$null
if (-not $text) { $text = & pdftotext -layout $pdf.FullName - 2>$null }
if (-not $text) { "TEXT: extraction failed (pip install pypdf)"; exit 1 }
$text | Set-Content -Encoding utf8 $txt
"TEXT: $txt ($(($text | Measure-Object -Line).Lines) lines)"
if (-not $Quiet) { $text | Select-Object -First 80 }
