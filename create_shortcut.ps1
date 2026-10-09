$desktop = [System.Environment]::GetFolderPath('Desktop')
$targetDir = $PSScriptRoot
$electronExe = Join-Path $targetDir "node_modules\electron\dist\electron.exe"
$iconFile = Join-Path $targetDir "icon.ico"

$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut((Join-Path $desktop "SportAnaliz Pro.lnk"))

if (Test-Path $electronExe) {
    $shortcut.TargetPath = $electronExe
    $shortcut.Arguments = "`"$targetDir`""
} else {
    $shortcut.TargetPath = (Join-Path $targetDir "SportAnaliz_Masaustu.vbs")
}

$shortcut.WorkingDirectory = $targetDir
$shortcut.IconLocation = "$iconFile,0"
$shortcut.Description = "SportAnaliz Pro Masaustu Uygulamasi"
$shortcut.Save()

Write-Host "Masaustu kisayolu basariyla guncellendi: $desktop\SportAnaliz Pro.lnk"
