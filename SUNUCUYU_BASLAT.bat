@echo off
chcp 65001 >nul
title SportAnaliz Pro — Yerel Sunucu (Port 3001)

echo ===================================================
echo   ⚡ SPORTANALIZ PRO — NESINE & PROXY SUNUCUSU
echo ===================================================
echo [BILGI] Port 3001 uzerinde Express sunucusu baslatiliyor...
echo [BILGI] Nesine canli bulten ve otomatik kupon motoru devrede.
echo ===================================================
echo.

node proxy-server.js

pause
