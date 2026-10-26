@echo off
setlocal
cd /d "%~dp0"
title Nesine.com - Otomatik Hesaba Kupon Kaydedici (SportAnaliz Pro)

echo ===================================================================
echo   SPORTANALIZ PRO - NESINE HESABA KUPON KAYDEDICI
echo   Uye: 14410079556
echo   Format: [Tarih] - 1, [Tarih] - 2, ... [Tarih] - 8
echo ===================================================================
echo [BILGI] Nesine penceresi aciliyor...
echo [BILGI] Kullanici adi ve sifreniz otomatik yazilacaktir.
echo [BILGI] Ekrana gelen 5 haneli Guvenlik Kodunu girip GIRIS butonuna basiniz.
echo.

node node_modules\electron\cli.js scripts\nesine_login_and_add_coupons.js

echo.
echo ===================================================================
echo   [TAMAMLANDI] Islem tamamlandi.
echo ===================================================================
pause
