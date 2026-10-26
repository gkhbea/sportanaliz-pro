@echo off
chcp 65001 > nul
title SportAnaliz Pro - Otomatik E-Posta Servisi Kurulumu
color 0B
echo ========================================================
echo   ⚡ SPORTANALIZ PRO - OTOMATİK E-POSTA KURULUMU
echo ========================================================
echo.
echo Bu işlem, Windows her açıldığında arka planda sessizce
echo çalışacak otomatik e-posta servisini kurar.
echo.
echo Böylece PROGRAMA HİÇ GİRMESENİZ BİLE:
echo  - Sabah 10:00'da kuponlar mailinize gelir,
echo  - Gece 23:30'da kuponların tutup tutmadığı mailinize gelir,
echo  - Pazar gecesi haftalık istatistikler mailinize gelir.
echo.
echo Kurulum yapılıyor...

cd /d "%~dp0"

:: 1. Windows Başlangıç Klasörüne (Startup) Kısayol Ekle
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.Environment]::GetFolderPath('Startup') + '\SportAnaliz_AutoMailer.lnk'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%~dp0scripts\run_mailer_silent.vbs\"'; $s.WorkingDirectory = '%~dp0'; $s.Save(); Write-Host '  [OK] Windows Baslangicina (Startup) eklendi.'"

:: 2. Windows Görev Zamanlayıcısına Görev Ekle
schtasks /create /tn "SportAnaliz_AutoMailer" /tr "wscript.exe \"%~dp0scripts\run_mailer_silent.vbs\"" /sc onlogon /f >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] Windows Görev Zamanlayıcısına başarıyla kaydedildi.
) else (
    echo   [BILGI] Görev Zamanlayıcı alternatif olarak Startup klasöründen otomatik çalışacaktır.
)

:: 3. Servisi Arka Planda Hemen Başlat
start "" wscript.exe "%~dp0scripts\run_mailer_silent.vbs"

echo.
echo ========================================================
echo 🎉 KURULUM TAMAMLANDI!
echo.
echo Otomatik e-posta servisi şu anda arka planda sessizce
echo çalışmaya başladı ve Windows her açıldığında otomatik açılacak.
echo.
echo Alıcı: gokhanelalyz@gmail.com
echo Kaldırmak isterseniz: GOREV_ZAMANLAYICI_KALDIR.bat çalıştırabilirsiniz.
echo ========================================================
pause
