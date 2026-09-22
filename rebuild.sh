#!/bin/bash

echo "🔧 Rebuilding native modules for Electron..."
echo ""

# Rebuild better-sqlite3 for Electron
echo "📦 Rebuilding better-sqlite3..."
npx electron-rebuild -f -w better-sqlite3

# Rebuild native macOS module
if [ -d "native/macos" ]; then
    echo "📦 Rebuilding ScreenCaptureKit..."
    cd native/macos
    node-gyp clean
    node-gyp configure
    node-gyp build
    cd ../..
fi

echo ""
echo "✅ Native modules rebuilt for Electron!"
echo ""
echo "Now you can run: npm run app:dev"

