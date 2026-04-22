@echo off
echo ========================================
echo   TRAVIAN ANALYZER - RESTART ALL
echo ========================================
echo.
echo Restartowanie wszystkich kontenerow...
echo.

cd /d "%~dp0.."
docker-compose restart

echo.
echo ========================================
echo   RESTART ZAKOŃCZONY
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
pause
