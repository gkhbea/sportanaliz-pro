@echo off
chcp 65001 > nul
title SportAnaliz Pro Baslatici
echo ===================================================
echo     ⚡ SportAnaliz Pro - Otomatik Baslatici ⚡
echo ===================================================
echo.

cd /d "%~dp0"

if not exist "node_modules\" (
    echo [BILGI] Ilk calistirma tespit edildi. Paketler yukleniyor...
    call npm install
    if errorlevel 1 (
        echo [HATA] Paketler yuklenirken bir sorun olustu. Node.js kurulu oldugundan emin olun.
        pause
        exit /b 1
    )
)

echo [BASLATILIYOR] SportAnaliz Pro aciliyor...
start http://localhost:3001
node proxy-server.js
pause
