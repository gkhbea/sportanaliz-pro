@echo off
setlocal
cd /d "%~dp0"
title Nesine.com - Otomatik Hesaba Kupon Kaydedici (SportAnaliz Pro)

:: ELECTRON_RUN_AS_NODE ortam değişkenini temizle (Electron GUI modunda açılsın)
set ELECTRON_RUN_AS_NODE=
set ELECTRON_NO_ATTACH_CONSOLE=

echo ===================================================================
echo   SPORTANALIZ PRO - NESINE HESABA KUPON KAYDEDICI
echo   Uye: 14410079556
echo   Format: [Tarih] - 1, [Tarih] - 2, ...
echo ===================================================================
echo [BILGI] Nesine penceresi aciliyor...
echo [BILGI] Kullanici adi ve sifreniz otomatik yazilacaktir.
echo [BILGI] Ekrana gelen Guvenlik Kodunu girip GIRIS butonuna basiniz.
echo.

if exist "node_modules\electron\dist\electron.exe" (
    "node_modules\electron\dist\electron.exe" "scripts\nesine_login_and_add_coupons.js"
) else (
    npx electron scripts\nesine_login_and_add_coupons.js
)

echo.
echo ===================================================================
echo   [TAMAMLANDI] Islem tamamlandi.
echo ===================================================================
pause
