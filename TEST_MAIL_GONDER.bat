@echo off
chcp 65001 > nul
title SportAnaliz Pro - E-Posta Test Gönderici
color 0B
echo ========================================================
echo   ⚡ SportAnaliz Pro - Otomatik E-Posta Testi
echo ========================================================
echo.
echo Alıcı: gokhanelalyz@gmail.com
echo.
echo [1/3] Günün Garantör Kuponları Maili
echo [2/3] Kupon Sonuçları (Tutan/Yatan) ve Kasa Raporu Maili
echo [3/3] Haftalık İstatistik Bülteni Maili
echo.
echo Gönderim başlatılıyor, lütfen bekleyin...
echo.

cd /d "%~dp0"
node scripts/autonomous_email_service.js --all

echo.
echo ========================================================
echo ✅ İşlem tamamlandı! 
echo E-postalar gönderildi veya önizleme linkleri oluşturuldu.
echo ========================================================
pause
