param([string]$CacheDirectory)
$ErrorActionPreference='Stop'
$desktopRepository=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$desktopCache=if($CacheDirectory){[System.IO.Path]::GetFullPath($CacheDirectory)}else{Join-Path $desktopRepository '.cache/electron'}
New-Item -ItemType Directory -Path $desktopCache -Force | Out-Null
$desktopArchive=Join-Path $desktopCache 'electron-v45.2.3-win32-x64.zip'
$desktopExpectedSha='489cd061908e697394b004298bf5ffd345c935d10e8ca197ba819f019ab2dec0'
if(-not (Test-Path -LiteralPath $desktopArchive)){
  Invoke-WebRequest -Uri 'https://github.com/electron/electron/releases/download/v45.2.3/electron-v45.2.3-win32-x64.zip' -OutFile $desktopArchive -TimeoutSec 300
}
$desktopActualSha=(Get-FileHash -LiteralPath $desktopArchive -Algorithm SHA256).Hash.ToLowerInvariant()
if($desktopActualSha -ne $desktopExpectedSha){throw 'Electron archive hash mismatch; do not package this download.'}
[PSCustomObject]@{version='45.2.3';archive=$desktopArchive;sha256=$desktopActualSha;verified=$true} | ConvertTo-Json
