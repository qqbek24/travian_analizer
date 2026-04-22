@echo off
echo ========================================
echo   REBUILD - WSZYSTKO
echo ========================================
echo.
echo Przebudowywanie wszystkich kontenerow...
echo.

cd /d "%~dp0.."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo.
echo ========================================
echo   WSZYSTKO PRZEBUDOWANE I URUCHOMIONE
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
pause
