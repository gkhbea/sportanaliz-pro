@echo off
chcp 65001 >nul
title SportAnaliz Pro - Otomatik Kaydet ve Canliya Gonder
color 0A

echo =======================================================
echo    🚀 SPORTANALIZ PRO - TEK TIKLA GÖNDERME SISTEMI
echo =======================================================
echo.

cd /d "%~dp0"

:: Git komutunu tespit et
set GIT_CMD=git
where git >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set GIT_CMD="C:\Program Files\Git\cmd\git.exe"
    ) else (
        for /d %%i in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do (
            if exist "%%i\resources\app\git\cmd\git.exe" (
                set GIT_CMD="%%i\resources\app\git\cmd\git.exe"
            )
        )
    )
)

echo [1/3] Değişiklikler taranıyor ve paketleniyor...
%GIT_CMD% add .

set MSG=otomatik_kayit_%date%_%time%
set MSG=%MSG: =_%
set MSG=%MSG:/=-%
set MSG=%MSG::=-%
set MSG=%MSG:.=-%

%GIT_CMD% commit -m "guncelleme: %MSG%" 2>nul

echo.
echo [2/3] GitHub ve Render'a yukleniyor (Push)...
%GIT_CMD% push origin master
%GIT_CMD% push origin master:main

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ GitHub yetkilendirme veya baglanti bekleniyor.
    echo Tarayicida GitHub giris penceresi acildiysa lutfen onaylayin.
    echo.
    pause
) else (
    echo.
    echo =======================================================
    echo   ✅ İŞLEM TAMAMLANDI!
    echo   Tüm kodlar buluta gönderildi.
    echo   Render canlı siteniz 1 dakika içinde otomatik güncellenecek!
    echo =======================================================
    echo.
    echo Bu pencere 5 saniye içinde otomatik kapanacaktır...
    timeout /t 5
)
