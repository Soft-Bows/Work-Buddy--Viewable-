@echo off
echo Starting Compass Pulse dev server...

:: Stop any stale instance first
pm2 delete compass-pulse 2>nul

:: Start Vite under pm2 (auto-restarts on crash)
pm2 start node_modules\.bin\vite.exe --name compass-pulse

:: Tail the log briefly so you can confirm it's up
timeout /t 5 /nobreak >nul
pm2 logs compass-pulse --lines 6 --nostream

echo.
echo Dev server running at http://localhost:8080
echo Run "pm2 stop compass-pulse" to stop it.
