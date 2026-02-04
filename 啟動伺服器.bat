@echo off
echo ====================================
echo   Sales App Server Starting...
echo ====================================
echo.

:: Start HTTP Server (separate window)
start "HTTP Server" cmd /k "cd /d c:\Users\shenjo\OneDrive - HP Inc\sales-app && python -m http.server 8080"

:: Wait 2 seconds for server to start
timeout /t 2 /nobreak >nul

:: Start Serveo Tunnel with auto-reconnect (separate window)
start "Serveo Tunnel" cmd /k "cd /d c:\Users\shenjo && :loop && ssh -R 80:localhost:8080 serveo.net && echo Reconnecting in 5 seconds... && timeout /t 5 && goto loop"

echo.
echo ====================================
echo   Two windows opened:
echo   1. HTTP Server (port 8080)
echo   2. Serveo Tunnel (public URL)
echo.
echo   Check Serveo window for URL!
echo   Format: https://xxxxx.serveousercontent.com
echo ====================================
echo.
pause
