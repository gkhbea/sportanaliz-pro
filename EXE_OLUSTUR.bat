@echo off
chcp 65001 >nul
title SportAnaliz Pro - EXE Paketleyici
color 0B

echo =======================================================
echo    ⚡ SPORTANALIZ PRO - WINDOWS EXE DERLEYICI
echo =======================================================
echo.
echo EXE paketleri hazirlaniyor, lutfen bekleyin...
echo.

cd /d "%~dp0"

cmd.exe /c npx electron-builder --win

echo.
if %errorlevel% equ 0 (
    echo =======================================================
    echo   ✅ EXE DOSYALARI BASARIYLA DERLENDI!
    echo.
    echo   1. dist\SportAnaliz Pro 1.0.0.exe (Tasınabilir / Portable Tek Dosya)
    echo   2. dist\SportAnaliz Pro Setup 1.0.0.exe (Kurulum Dosyasi)
    echo   3. dist\win-unpacked\SportAnaliz Pro.exe (Klasorden Direkt Calisan)
    echo =======================================================
    echo.
    powershell -ExecutionPolicy Bypass -File "%~dp0create_shortcut.ps1"
) else (
    echo ⚠️ Derleme sirasinda hata olustu.
)

echo.
pause
