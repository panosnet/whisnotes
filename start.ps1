# WhisNotes Start Script for Windows (PowerShell)

Write-Host "🚀 Starting WhisNotes on Windows..." -ForegroundColor Cyan
Write-Host ""

# Check if venv exists
if (-Not (Test-Path "venv")) {
    Write-Host "⚠️  Python venv not found. Creating it..." -ForegroundColor Yellow
    python -m venv venv
    & .\venv\Scripts\Activate.ps1
    Write-Host "📦 Installing OpenAI Whisper..." -ForegroundColor Green
    pip install openai-whisper
} else {
    & .\venv\Scripts\Activate.ps1
}

# Check if node_modules exists
if (-Not (Test-Path "node_modules")) {
    Write-Host "📦 Installing Node dependencies..." -ForegroundColor Green
    npm install
}

Write-Host ""
Write-Host "✅ All set! Starting app..." -ForegroundColor Green
Write-Host ""

npm run app:dev
