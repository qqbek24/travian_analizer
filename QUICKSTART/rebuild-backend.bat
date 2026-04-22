@echo off
echo ========================================
echo   REBUILD - BACKEND ONLY
echo ========================================
echo.
echo Przebudowywanie kontenera backendu...
echo.

cd /d "%~dp0.."
docker-compose stop backend
docker-compose build --no-cache backend
docker-compose up -d backend

echo.
echo ========================================
echo   BACKEND PRZEBUDOWANY I URUCHOMIONY
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
pause
