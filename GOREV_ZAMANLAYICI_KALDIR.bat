@echo off
chcp 65001 > nul
title SportAnaliz Pro - Otomatik E-Posta Servisini Kaldır
color 0C
echo ========================================================
echo   ⚡ SPORTANALIZ PRO - OTOMATİK E-POSTA SERVİSİNİ KALDIR
echo ========================================================
echo.
echo Otomatik e-posta servisi sistemden kaldırılıyor...

:: 1. Windows Başlangıç Kısayolunu Sil
powershell -NoProfile -ExecutionPolicy Bypass -Command "$path = [System.Environment]::GetFolderPath('Startup') + '\SportAnaliz_AutoMailer.lnk'; if (Test-Path $path) { Remove-Item $path -Force; Write-Host '  [OK] Startup kisayolu silindi.' } else { Write-Host '  [BILGI] Startup kisayolu bulunamadi.' }"

:: 2. Görev Zamanlayıcıdan Görevi Sil
schtasks /delete /tn "SportAnaliz_AutoMailer" /f >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] Windows Görev Zamanlayıcı görevi silindi.
)

:: 3. Çalışan Arka Plan Sürecini Durdur
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *autonomous_email_service*" >nul 2>&1

echo.
echo ========================================================
echo ✅ Otomatik e-posta servisi başarıyla durduruldu ve kaldırıldı.
echo ========================================================
pause
