@echo off
title SportAnaliz Pro - Masaustu Kisayolu
color 0A

echo =======================================================
echo    SPORTANALIZ PRO - MASAUSTU KISAYOLU OLUSTURUCU
echo =======================================================
echo.

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0create_shortcut.ps1"

echo.
echo =======================================================
echo   ISLEM TAMAMLANDI!
echo   Masaustunuze 'SportAnaliz Pro' simgesi eklendi!
echo =======================================================
echo.
timeout /t 5 >nul 2>nul
