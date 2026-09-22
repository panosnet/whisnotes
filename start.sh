#!/bin/bash

echo "🚀 Starting WhisNotes..."
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "⚠️  Python venv not found. Creating it..."
    python3 -m venv venv
    source venv/bin/activate
    echo "📦 Installing OpenAI Whisper..."
    pip install openai-whisper
else
    source venv/bin/activate
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node dependencies..."
    npm install
fi

# Check if native module is built
if [ ! -f "native/macos/build/Release/screencapturekit.node" ]; then
    echo "🔨 Building native module..."
    npm run build:native
fi

echo ""
echo "✅ All set! Starting app..."
echo ""
echo "⚠️  Use MICROPHONE MODE (not System Audio) to avoid crashes!"
echo ""

npm start
