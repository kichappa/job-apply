<#
Auto-update check, run every time the skill loads.
Prints exactly one status word first: UP-TO-DATE | UPDATE-AVAILABLE | UPDATED | DIRTY | DIVERGED | SKIPPED
  -Apply  fast-forward to the remote (only when the working tree is clean and not diverged)
Network failures never block the skill: they print SKIPPED.
#>
param([switch]$Apply)
$dir = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $dir '.git'))) { 'SKIPPED (not a git checkout)'; exit 0 }
$git = { param([string[]]$a) & git -C $dir @a 2>$null }

$job = Start-Job { param($d) git -C $d fetch --quiet origin 2>&1 } -ArgumentList $dir
if (-not (Wait-Job $job -Timeout 8)) { Stop-Job $job; Remove-Job $job -Force; 'SKIPPED (fetch timed out)'; exit 0 }
Remove-Job $job -Force

$up = (& $git @('rev-parse', '--abbrev-ref', '@{u}'))
if (-not $up) { 'SKIPPED (no upstream branch)'; exit 0 }
$behind = [int](& $git @('rev-list', '--count', 'HEAD..@{u}'))
$ahead = [int](& $git @('rev-list', '--count', '@{u}..HEAD'))
if ($behind -eq 0) { "UP-TO-DATE ($(& $git @('rev-parse','--short','HEAD')))"; exit 0 }
if ($ahead -gt 0) { "DIVERGED (local $ahead ahead, $behind behind $up) - resolve by hand"; exit 0 }
$dirty = & $git @('status', '--porcelain')
if ($dirty) { "DIRTY ($behind new commits on $up, but local edits exist) - commit or stash first"; exit 0 }
if (-not $Apply) {
  "UPDATE-AVAILABLE ($behind commits on $up)"
  & $git @('log', '--oneline', 'HEAD..@{u}') | Select-Object -First 10
  exit 0
}
& $git @('merge', '--ff-only', '--quiet', '@{u}') | Out-Null
"UPDATED to $(& $git @('rev-parse','--short','HEAD')) ($behind commits). Re-read SKILL.md."
