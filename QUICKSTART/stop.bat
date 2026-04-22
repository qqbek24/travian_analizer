@echo off
echo ========================================
echo   TRAVIAN ANALYZER - STOP ALL
echo ========================================
echo.
echo Zatrzymywanie wszystkich kontenerow...
echo.

cd /d "%~dp0.."
docker-compose down

echo.
echo ========================================
echo   ZATRZYMANO WSZYSTKIE KONTENERY
echo ========================================
echo.
pause
