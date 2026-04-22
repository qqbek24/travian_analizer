@echo off
echo ========================================
echo   Travian Analyzer - Frontend Start
echo ========================================
echo.

cd frontend

if not exist "node_modules\" (
    echo [1/2] Instalacja zaleznosci npm...
    call npm install
    echo.
)

echo [2/2] Uruchamianie frontendu...
echo.
echo Aplikacja bedzie dostepna na: http://localhost:3000
echo.
echo Aby zatrzymac serwer nacisnij CTRL+C
echo.

call npm run dev

pause
