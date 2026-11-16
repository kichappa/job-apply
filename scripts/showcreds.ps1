# Reveal the generated ATS passwords (run by the user, in their own terminal) so they can be saved
# into the browser's password manager. Only the Windows account that created them can decrypt them.
$cfgDir = if ($env:JOB_APPLY_HOME) { $env:JOB_APPLY_HOME } else { Join-Path $HOME '.job-apply' }
Get-ChildItem (Join-Path $cfgDir 'creds') -Filter *.dpapi -ErrorAction SilentlyContinue | ForEach-Object {
  $_.BaseName + ' : ' + [System.Net.NetworkCredential]::new('', (Get-Content $_.FullName | ConvertTo-SecureString)).Password
}
