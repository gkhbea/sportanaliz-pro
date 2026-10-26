$ws = New-Object -ComObject WScript.Shell
$startupPath = [System.Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupPath "SportAnaliz_AutoMailer.lnk"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$vbsPath = Join-Path $scriptDir "run_mailer_silent.vbs"

$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$vbsPath`""
$shortcut.WorkingDirectory = $rootDir
$shortcut.Save()

Write-Host "Basariyla Windows Baslangicina (Startup) eklendi: $shortcutPath"
