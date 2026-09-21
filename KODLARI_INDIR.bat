@echo off
chcp 65001 >nul
title SportAnaliz Pro - Diger Bilgisayardaki Kodlari Indir
color 0B

echo =======================================================
echo    📥 SPORTANALIZ PRO - GÜNCEL KODLARI ÇEKME
echo =======================================================
echo.

cd /d %~dp0

:: Git komutunu tespit et
set GIT_CMD=git
where git >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set GIT_CMD="C:\Program Files\Git\cmd\git.exe"
    ) else (
        for /d %%i in (%LOCALAPPDATA%\GitHubDesktop\app-*) do (
            if exist %%i\resources\app\git\cmd\git.exe (
                set GIT_CMD=%%i\resources\app\git\cmd\git.exe
            )
        )
    )
)

echo [1/2] GitHub'daki en son yenilikler kontrol ediliyor...
%GIT_CMD% pull origin main
if %errorlevel% neq 0 (
    %GIT_CMD% pull origin master
)

echo.
echo =======================================================
echo   ✅ GÜNCELLEME TAMAMLANDI!
echo   Diğer bilgisayarda yaptığınız tüm kodlar buraya aktarıldı.
echo   Çalışmaya hazırsınız!
echo =======================================================
echo.
echo Bu pencere 5 saniye içinde otomatik kapanacaktır...
timeout /t 5
