@echo off
echo ========================================
echo   TRAVIAN ANALYZER - START ALL
echo ========================================
echo.
echo Uruchamianie wszystkich kontenerow...
echo.

cd /d "%~dp0.."
docker-compose up -d

echo.
echo ========================================
echo   APLIKACJA DZIALA!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Aby zatrzymac: stop.bat
echo Aby zobaczyc logi: logs-backend.bat / logs-frontend.bat
echo.
pause
