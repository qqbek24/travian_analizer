@echo off
echo.
echo ========================================
echo   TRAVIAN ANALYZER - DOCKER MODE
echo ========================================
echo.
echo Aby uruchomic aplikacje, przejdz do folderu QUICKSTART
echo i uruchom jeden z dostepnych skryptow:
echo.
echo   start.bat          - Uruchom aplikacje
echo   stop.bat           - Zatrzymaj aplikacje
echo   restart.bat        - Restart aplikacji
echo   rebuild-all.bat    - Przebuduj wszystko
echo   status.bat         - Sprawdz status
echo.
echo Lub uruchom bezposrednio:
echo.

cd /d "%~dp0QUICKSTART"
call start.bat
