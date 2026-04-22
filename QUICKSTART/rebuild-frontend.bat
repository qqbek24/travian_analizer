@echo off
echo ========================================
echo   REBUILD - FRONTEND ONLY
echo ========================================
echo.
echo Przebudowywanie kontenera frontendu...
echo.

cd /d "%~dp0.."
docker-compose stop frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

echo.
echo ========================================
echo   FRONTEND PRZEBUDOWANY I URUCHOMIONY
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo.
pause
