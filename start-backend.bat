@echo off
echo ========================================
echo   Travian Analyzer - Backend Start
echo ========================================
echo.

cd backend

if not exist "venv\" (
    echo [1/3] Tworzenie srodowiska wirtualnego...
    python -m venv venv
    echo.
)

echo [2/3] Aktywacja srodowiska...
call venv\Scripts\activate

echo.
echo [3/3] Uruchamianie backendu...
echo.
echo Backend bedzie dostepny na: http://localhost:8000
echo API dokumentacja: http://localhost:8000/docs
echo.
echo Aby zatrzymac serwer nacisnij CTRL+C
echo.

python main.py

pause
