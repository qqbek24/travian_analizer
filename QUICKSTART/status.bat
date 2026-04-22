@echo off
echo ========================================
echo   STATUS - WSZYSTKIE KONTENERY
echo ========================================
echo.

cd /d "%~dp0.."
docker-compose ps

echo.
echo ========================================
echo   STATYSTYKI ZASOBÓW
echo ========================================
echo.

docker stats --no-stream travian-backend travian-frontend 2>nul

echo.
pause
