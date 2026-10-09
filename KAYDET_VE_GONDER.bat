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
echo [2/3] GitHub ile senkronize ediliyor...
%GIT_CMD% pull --rebase origin main 2>nul

echo [3/3] GitHub ve Render'a yukleniyor (Push)...
%GIT_CMD% push origin HEAD:main
if %errorlevel% equ 0 (
    %GIT_CMD% push origin HEAD:master 2>nul
    echo.
    echo =======================================================
    echo   ✅ İŞLEM BAŞARIYLA TAMAMLANDI!
    echo   Tüm kodlar GitHub'a gönderildi.
    echo   Render canlı siteniz 1 dakika içinde otomatik güncellenecek!
    echo =======================================================
    echo.
    echo Bu pencere 5 saniye içinde otomatik kapanacaktır...
    timeout /t 5
) else (
    echo.
    echo ⚠️ Hata: Gönderme tamamlanamadı.
    echo Olası nedenler: İnternet bağlantısı veya GitHub yetkilendirmesi.
    echo.
    pause
)
