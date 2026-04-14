@echo off
:: Start SafeGuard Senior - Python AI Analyzer
:: Run this from the python-analyzer directory

echo 🚀 Starting SafeGuard Senior - Python AI Analyzer...

:: Check venv
if not exist "venv\" (
    echo ❌ Virtual environment not found.
    echo Run: python -m venv venv
    echo Then: venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

:: Activate venv
call venv\Scripts\activate.bat

echo ✅ Virtual environment activated
echo 🔧 Starting FastAPI server on http://localhost:8001
echo.

:: Start the server
python app.py

pause
