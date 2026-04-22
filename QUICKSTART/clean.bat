@echo off
echo ========================================
echo   CLEAN - USUŃ WSZYSTKO
echo ========================================
echo.
echo UWAGA! To usunie:
echo - Wszystkie kontenery Travian Analyzer
echo - Obrazy Dockera
echo - Nieuzywane wolumeny
echo.
set /p confirm="Kontynuowac? (T/N): "
if /i "%confirm%" NEQ "T" goto :end

echo.
echo Czyszczenie...
echo.

cd /d "%~dp0.."
docker-compose down -v
docker-compose down --rmi all

echo.
echo ========================================
echo   CZYSZCZENIE ZAKOŃCZONE
echo ========================================
echo.
echo Aby uruchomic aplikacje ponownie: start.bat
echo.
:end
pause
