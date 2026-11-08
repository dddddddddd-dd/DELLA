@echo off
title DELLA Launcher
setlocal

cd /d "%~dp0"
set "PROJECT_ROOT=%~dp0"

echo ========================================================
echo   DELLA - Logistika va yuk tanlash xizmati
echo ========================================================
echo.
echo [1/3] Backend server ishga tushirilmoqda (Port 5000)...
start "DELLA Backend (Port 5000)" /D "%PROJECT_ROOT%backend" cmd /k "npm run dev"

ping 127.0.0.1 -n 4 > nul

echo [2/3] Frontend sayt ishga tushirilmoqda (Port 3000)...
start "DELLA Frontend (Port 3000)" /D "%PROJECT_ROOT%frontend" cmd /k "npm run dev"

ping 127.0.0.1 -n 3 > nul

echo [3/3] Brauzerda sayt ochilmoqda: http://localhost:3000 ...
start http://localhost:3000

echo.
echo ========================================================
echo   [OK] BARCHASI ISHGA TUSHDI!
echo   Sayt manzili: http://localhost:3000
echo   (Server oynalarini yopmang, ular ishlashi kerak)
echo ========================================================
echo.
pause
