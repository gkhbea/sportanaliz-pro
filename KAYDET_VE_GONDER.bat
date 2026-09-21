@echo off
chcp 65001 >nul
title SportAnaliz Pro - Otomatik Kaydet ve Canliya Gonder
color 0A

echo =======================================================
echo    🚀 SPORTANALIZ PRO - TEK TIKLA GÖNDERME SISTEMI
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

echo [1/3] Değişiklikler taranıyor ve paketleniyor...
%GIT_CMD% add .

for /f tokens=1-4 delims=/:.  %%a in (%date% %time%) do (
    set MSG=otomatik_kayit_%%a-%%b-%%c_%%d
)

%GIT_CMD% commit -m guncelleme: %MSG%

echo.
echo [2/3] GitHub ve Render'a yukleniyor (Push)...
%GIT_CMD% push origin main
if %errorlevel% neq 0 (
    %GIT_CMD% push origin master
)

echo.
echo =======================================================
echo   ✅ İŞLEM TAMAMLANDI!
echo   Tüm kodlar buluta gönderildi.
echo   Render canlı siteniz 1 dakika içinde otomatik güncellenecek!
echo =======================================================
echo.
echo Bu pencere 5 saniye içinde otomatik kapanacaktır...
timeout /t 5
