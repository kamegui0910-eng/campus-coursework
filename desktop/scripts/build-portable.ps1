param([string]$RuntimeZip,[string]$OutputRoot,[string]$Version='0.2.0')
$ErrorActionPreference='Stop'
$desktopSource=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$desktopRepository=[System.IO.Path]::GetFullPath((Join-Path $desktopSource '..'))
if(-not $RuntimeZip){throw 'Pass the verified Electron v45.2.3 Windows x64 runtime ZIP.'}
$desktopRuntime=[System.IO.Path]::GetFullPath($RuntimeZip)
if((Get-FileHash -LiteralPath $desktopRuntime -Algorithm SHA256).Hash.ToLowerInvariant() -ne '489cd061908e697394b004298bf5ffd345c935d10e8ca197ba819f019ab2dec0'){throw 'Unexpected runtime archive'}
if(-not $OutputRoot){$OutputRoot=Join-Path $desktopRepository 'dist'}
$desktopOutput=[System.IO.Path]::GetFullPath($OutputRoot)
$desktopDestination=Join-Path $desktopOutput "CampusCoursework-$Version-win-x64"
if(Test-Path -LiteralPath $desktopDestination){throw 'Build destination already exists. Use a new version directory; no existing package is deleted.'}
foreach($desktopRequired in @('main.cjs','preload.cjs','package.json','pdf.cjs','login-browser.cjs','login-page-preload.cjs','ui/index.html','ui/app.js','ui/styles.css','services/index.cjs','services/logins.cjs')){
  if(-not (Test-Path -LiteralPath (Join-Path $desktopSource $desktopRequired) -PathType Leaf)){throw "Missing application file: $desktopRequired"}
}
New-Item -ItemType Directory -Path $desktopDestination -Force | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
$desktopZipReader=[System.IO.Compression.ZipFile]::OpenRead($desktopRuntime)
try{
  foreach($desktopEntry in $desktopZipReader.Entries){
    $desktopExpanded=[System.IO.Path]::GetFullPath((Join-Path $desktopDestination $desktopEntry.FullName))
    if(-not $desktopExpanded.StartsWith($desktopDestination+[System.IO.Path]::DirectorySeparatorChar,[System.StringComparison]::OrdinalIgnoreCase)){throw 'Runtime archive path escaped output directory'}
  }
}finally{$desktopZipReader.Dispose()}
Expand-Archive -LiteralPath $desktopRuntime -DestinationPath $desktopDestination
$desktopApp=Join-Path $desktopDestination 'resources/app'
New-Item -ItemType Directory -Path $desktopApp -Force | Out-Null
foreach($desktopName in @('main.cjs','preload.cjs','package.json','pdf.cjs','login-browser.cjs','login-page-preload.cjs','ui','services','assets','node_modules')){
  $desktopPath=Join-Path $desktopSource $desktopName
  if(-not (Test-Path -LiteralPath $desktopPath)){throw "Missing runtime dependency $desktopName"}
  Copy-Item -LiteralPath $desktopPath -Destination $desktopApp -Recurse
}
$desktopSkillDestination=Join-Path $desktopApp 'skills'
New-Item -ItemType Directory -Path $desktopSkillDestination -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $desktopRepository 'skills/campus-coursework') -Destination $desktopSkillDestination -Recurse
Rename-Item -LiteralPath (Join-Path $desktopDestination 'electron.exe') -NewName 'CampusCoursework.exe'
if(Test-Path -LiteralPath (Join-Path $desktopDestination 'electron_wer.dll')){Rename-Item -LiteralPath (Join-Path $desktopDestination 'electron_wer.dll') -NewName 'CampusCoursework_wer.dll'}
@"
Campus Coursework $Version

双击 CampusCoursework.exe 启动。分享给朋友时请发送整个ZIP；解压后保留完整文件夹。
第一次使用：设置 → 配置自己的模型/API → 连接课程或导入资料。
数据与加密密钥保存在当前Windows用户的应用数据目录，不会写进分享包。
计划任务只在程序运行时执行。外部检测和正式提交需独立核验；本版不会冒充检测完成或自动提交。
"@ | Set-Content -LiteralPath (Join-Path $desktopDestination '开始使用.txt') -Encoding utf8
$desktopFinalArchive=Join-Path $desktopOutput "CampusCoursework-$Version-win-x64.zip"
if(Test-Path -LiteralPath $desktopFinalArchive){throw 'Archive already exists; not overwriting.'}
[System.IO.Compression.ZipFile]::CreateFromDirectory($desktopDestination,$desktopFinalArchive,[System.IO.Compression.CompressionLevel]::Optimal,$true)
$desktopReceipt=[PSCustomObject]@{version=$Version;executable=(Join-Path $desktopDestination 'CampusCoursework.exe');archive=$desktopFinalArchive;sha256=(Get-FileHash -LiteralPath $desktopFinalArchive -Algorithm SHA256).Hash.ToLowerInvariant();runtime='Electron45.2.3';platform='Windowsx64'}
$desktopReceipt | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $desktopOutput "build-$Version.json") -Encoding utf8
$desktopReceipt | ConvertTo-Json
