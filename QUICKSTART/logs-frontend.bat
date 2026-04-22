@echo off
echo ========================================
echo   LOGI - FRONTEND
echo ========================================
echo.
echo Wyswietlanie logow frontendu...
echo Aby wyjsc nacisnij CTRL+C
echo.

cd /d "%~dp0.."
docker-compose logs -f frontend
