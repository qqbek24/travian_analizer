@echo off
echo ========================================
echo   LOGI - BACKEND
echo ========================================
echo.
echo Wyswietlanie logow backendu...
echo Aby wyjsc nacisnij CTRL+C
echo.

cd /d "%~dp0.."
docker-compose logs -f backend
