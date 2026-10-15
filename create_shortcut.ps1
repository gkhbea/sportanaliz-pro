$desktop = [System.Environment]::GetFolderPath('Desktop')
$targetDir = $PSScriptRoot
$compiledExe = Join-Path $targetDir "dist\win-unpacked\SportAnaliz Pro.exe"
$portableExe = Join-Path $targetDir "dist\SportAnaliz Pro 1.0.0.exe"
$electronExe = Join-Path $targetDir "node_modules\electron\dist\electron.exe"
$iconFile = Join-Path $targetDir "icon.ico"

$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut((Join-Path $desktop "SportAnaliz Pro.lnk"))

if (Test-Path $compiledExe) {
    $shortcut.TargetPath = $compiledExe
    $shortcut.Arguments = ""
    $shortcut.WorkingDirectory = (Join-Path $targetDir "dist\win-unpacked")
} elseif (Test-Path $portableExe) {
    $shortcut.TargetPath = $portableExe
    $shortcut.Arguments = ""
    $shortcut.WorkingDirectory = (Join-Path $targetDir "dist")
} elseif (Test-Path $electronExe) {
    $shortcut.TargetPath = $electronExe
    $shortcut.Arguments = "`"$targetDir`""
    $shortcut.WorkingDirectory = $targetDir
} else {
    $shortcut.TargetPath = (Join-Path $targetDir "SportAnaliz_Masaustu.vbs")
    $shortcut.WorkingDirectory = $targetDir
}

$shortcut.IconLocation = "$iconFile,0"
$shortcut.Description = "SportAnaliz Pro Masaustu Uygulamasi"
$shortcut.Save()

Write-Host "Masaustu kisayolu basariyla olusturuldu: $desktop\SportAnaliz Pro.lnk"
