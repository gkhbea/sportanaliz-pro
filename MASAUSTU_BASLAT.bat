@echo off
chcp 65001 >nul
title SportAnaliz Pro - Masaustu
color 0B

echo =======================================================
echo    ⚡ SPORTANALIZ PRO - MASAÜSTÜ UYGULAMASI
echo =======================================================
echo.
echo Başlatılıyor, lütfen bekleyin...

cd /d "%~dp0"

if not exist "node_modules\" (
    echo [BILGI] Ilk calistirma icin paketler kontrol ediliyor...
    call npm install
)

call npx electron .
