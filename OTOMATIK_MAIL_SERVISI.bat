@echo off
chcp 65001 > nul
title SportAnaliz Pro - 7/24 Otonom E-Posta Servisi
color 0A
echo ========================================================
echo   ⚡ SPORTANALIZ PRO - 7/24 OTONOM E-POSTA SERVİSİ
echo ========================================================
echo.
echo Alıcı: gokhanelalyz@gmail.com
echo.
echo Bu servis arka planda sürekli çalışarak:
echo  1. Her sabah saat 10:00'da günün hazır kuponlarını,
echo  2. Her gece saat 23:30'da kuponların tutup tutmadığını ve net kârı,
echo  3. Her Pazar gecesi / Pazartesi sabahı haftalık istatistik bültenini
echo  otomatik olarak mail atar.
echo.
echo Programa bakmanıza gerek kalmadan tüm raporlar mailinize gelecektir.
echo Bu pencereyi simge durumuna küçültebilirsiniz.
echo.
echo (Windows her açıldığında otomatik başlaması için GOREV_ZAMANLAYICI_KUR.bat çalıştırabilirsiniz)
echo ========================================================
echo.

cd /d "%~dp0"
node scripts/autonomous_email_service.js
pause
