# 🚀 How to Run WhisNotes

## Quick Start (If Already Set Up)

```bash
npm run app:dev
```

---

## First Time Setup

### 1️⃣ Install System Dependencies

**macOS:**
```bash
# Install Node.js 22 LTS (if not installed)
brew install node@22
brew link node@22 --force

# Install SoX for audio capture
brew install sox

# Verify installations
node --version  # Should show v22.x.x
sox --version   # Should show SoX version
```

### 2️⃣ Install Python & Whisper

```bash
# Create Python virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install OpenAI Whisper (for FREE local transcription)
pip install openai-whisper

# Verify installation
python -c "import whisper; print('Whisper installed!')"
```

### 3️⃣ Install Node Dependencies

```bash
# Install all npm packages
npm install
```

### 4️⃣ Build Native Module (macOS System Audio)

```bash
# Build ScreenCaptureKit native module
npm run build:native
```

**Expected output:**
```
gyp info it worked if it ends with ok
...
gyp info ok
```

### 5️⃣ Run the App!

```bash
npm run app:dev
```

**This starts:**
- ✅ Vite dev server (React frontend)
- ✅ Electron app (desktop window)

---

## 📱 Using the App

### First Launch

1. **App Opens** - You'll see the WhisNotes home screen
2. **Go to Settings** ⚙️
   - Select "Whisper Mode": **Local FREE** (default)
   - Choose model: **Small** (recommended)
   - Click "Save Settings"

### Recording Your First Meeting

**Option 1: Microphone (Your Voice)**
1. Click **Microphone** 🎤 icon in sidebar
2. Select "Microphone (Your Voice)"
3. Click "Start Recording"
4. Speak!
5. Click "Stop Recording"

**Option 2: System Audio (Google Meet, Slack, Zoom)**
1. Click **Microphone** 🎤 icon
2. Select "System Audio (Google Meet, Slack, Zoom)"
3. **First time:** macOS asks for Screen Recording permission
   - Go to System Settings → Privacy & Security → Screen Recording
   - Enable permission for Terminal or Electron
   - Restart app
4. Join a Google Meet/Slack call
5. Click "Start Recording"
6. Meeting audio gets transcribed!

### View Your Meetings

1. **Meetings** 📄 - See all recordings
2. **Calendar** 📅 - View by date with stats
3. Click any meeting to see transcript

---

## 🐛 Troubleshooting

### App Won't Start

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build:native
npm run app:dev
```

### Native Module Error

```bash
# Rebuild native module
cd native/macos
npx node-gyp clean
npx node-gyp configure
npx node-gyp build
cd ../..
npm run app:dev
```

### Transcription Not Working

**Local Mode:**
```bash
# Make sure Python venv is activated
source venv/bin/activate

# Check Whisper installed
pip list | grep openai-whisper

# Reinstall if needed
pip install --upgrade openai-whisper
```

**API Mode:**
- Go to Settings ⚙️
- Add OpenAI API key
- Switch to "OpenAI API (Paid)"
- Save

### Audio Not Capturing

**Microphone:**
- Check System Settings → Privacy → Microphone
- Enable for Terminal/Electron

**System Audio:**
- Check System Settings → Privacy → Screen Recording
- Enable for Terminal/Electron
- Requires macOS 13+ (Ventura, Sonoma, Sequoia)

### "SoX not found"

```bash
brew install sox
```

### "Python not found" or "Whisper not found"

```bash
# Activate venv first!
source venv/bin/activate

# Then run app
npm run app:dev
```

---

## 🎯 Development Commands

```bash
# Run app in development mode
npm run app:dev

# Build native module
npm run build:native

# Type check
npm run type-check

# Build for production
npm run build

# Build directory only (faster testing)
npm run build:dir
```

---

## 📊 What to Expect

### First Recording
- **Local Whisper** downloads model (~75MB to 2.9GB depending on choice)
- **First transcription** may take 30-60 seconds
- **Subsequent recordings** are faster

### Performance
- **Tiny/Base**: Real-time transcription
- **Small**: 2-3x slower than real-time (recommended)
- **Medium**: 4-5x slower
- **Large**: 6-10x slower

### Storage
- Models stored in: `~/.cache/whisper/`
- Meetings database: `~/Library/Application Support/whisnotes/`

---

## 🎉 You're Ready!

```bash
# Activate Python (if not active)
source venv/bin/activate

# Run the app
npm run app:dev
```

**Enjoy your FREE AI-powered meeting transcription!** 🚀

---

## 💡 Tips

1. **For best quality:** Use "Small" or "Medium" model
2. **For speed:** Use "Tiny" or "Base" model
3. **English only?** Use .en models (better accuracy)
4. **Multiple languages?** Use non-.en models
5. **Google Meet:** Select "System Audio" source
6. **Voice notes:** Select "Microphone" source

