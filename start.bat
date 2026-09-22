@echo off
echo 🚀 Starting WhisNotes on Windows...
echo.

REM Check if venv exists
if not exist "venv\" (
    echo ⚠️  Python venv not found. Creating it...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo 📦 Installing OpenAI Whisper...
    pip install openai-whisper
) else (
    call venv\Scripts\activate.bat
)

REM Check if node_modules exists
if not exist "node_modules\" (
    echo 📦 Installing Node dependencies...
    call npm install
)

echo.
echo ✅ All set! Starting app...
echo.

call npm run app:dev
