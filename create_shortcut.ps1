$desktop = [System.Environment]::GetFolderPath('Desktop')
$targetDir = $PSScriptRoot
$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut((Join-Path $desktop "SportAnaliz Pro.lnk"))
$shortcut.TargetPath = (Join-Path $targetDir "SportAnaliz_Masaustu.vbs")
$shortcut.WorkingDirectory = $targetDir
$shortcut.IconLocation = (Join-Path $targetDir "icon.ico")
$shortcut.Description = "SportAnaliz Pro Masaustu"
$shortcut.Save()
Write-Host "Masaustu kisayolu basariyla olusturuldu: $desktop\SportAnaliz Pro.lnk"
