# 🪟 WhisNotes - Windows Setup Guide

## ⚡ Quick Start

### Option 1: Using Batch Script (Easiest!)

```cmd
cd C:\path\to\whisnotes
start.bat
```

### Option 2: Using PowerShell

```powershell
cd C:\path\to\whisnotes
.\start.ps1
```

---

## 🔧 First Time Setup

### 1️⃣ Install Prerequisites

**Required Software:**

1. **Node.js 22 LTS**
   - Download: https://nodejs.org/en/download
   - Install the "LTS" version
   - Verify: Open Command Prompt and run:
     ```cmd
     node --version
     ```
     Should show: `v22.x.x`

2. **Python 3.8+**
   - Download: https://www.python.org/downloads/
   - **IMPORTANT**: Check "Add Python to PATH" during installation
   - Verify:
     ```cmd
     python --version
     ```
     Should show: `Python 3.x.x`

3. **Git** (optional, for cloning)
   - Download: https://git-scm.com/download/win

### 2️⃣ Install Python Dependencies

**Open Command Prompt or PowerShell:**

```cmd
cd C:\path\to\whisnotes

REM Create virtual environment
python -m venv venv

REM Activate virtual environment
venv\Scripts\activate.bat

REM Install Whisper (this takes a few minutes)
pip install openai-whisper

REM Verify installation
python -c "import whisper; print('Whisper installed successfully!')"
```

**For PowerShell:**
```powershell
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# If you get execution policy error:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then try activating again
.\venv\Scripts\Activate.ps1
```

### 3️⃣ Install Node Dependencies

```cmd
npm install
```

### 4️⃣ Run the App!

```cmd
npm run app:dev
```

---

## 📱 What Works on Windows

### ✅ Currently Working:
- ✅ **Microphone Recording** - Record your voice
- ✅ **FREE Local Whisper** - All 11 models
- ✅ **Paid API Mode** - OpenAI Whisper API
- ✅ **Transcription** - 99+ languages
- ✅ **Notes & Calendar** - Full functionality
- ✅ **Meeting Management** - All features
- ✅ **Database** - SQLite works great
- ✅ **Beautiful UI** - All views work

### ⏳ Coming Soon:
- ⏳ **System Audio Capture** (Google Meet, Slack, Zoom)
  - Requires WASAPI implementation (~2 hours)
  - Currently only works on macOS
  - Workaround: Use "Microphone" mode for now

---

## 🎤 Audio Capture on Windows

### Microphone (Works Now!)
```
Your Voice → Microphone → WhisNotes → Transcription ✅
```

**How to use:**
1. Click Microphone 🎤 icon
2. Select "Microphone (Your Voice)"
3. Click "Start Recording"
4. Speak into your microphone
5. Click "Stop Recording"

### System Audio (Not Yet Implemented)
```
Google Meet/Slack → System Audio → WhisNotes ❌ (Coming Soon)
```

**Workaround Options:**

**Option A: Use Virtual Audio Cable (Advanced)**
1. Install VB-Audio Virtual Cable: https://vb-audio.com/Cable/
2. Set Google Meet/Slack output to "CABLE Input"
3. Set WhisNotes to record from "CABLE Output"
4. Works but requires manual routing

**Option B: Use Microphone Mode**
1. Join meeting with speakers
2. Use WhisNotes in microphone mode
3. Record through your mic
4. Quality depends on room acoustics

**Option C: Wait for WASAPI Implementation**
- We'll add Windows system audio soon (~2 hours work)
- Will work like macOS version
- Track progress in GitHub issues

---

## 🚀 Running the App

### Every Time You Start:

**Command Prompt:**
```cmd
cd C:\path\to\whisnotes
venv\Scripts\activate.bat
npm run app:dev
```

**PowerShell:**
```powershell
cd C:\path\to\whisnotes
.\venv\Scripts\Activate.ps1
npm run app:dev
```

**Or use the script:**
```cmd
start.bat
```
```powershell
.\start.ps1
```

---

## 🐛 Windows-Specific Troubleshooting

### "Python not recognized"
- Reinstall Python
- Check "Add Python to PATH" during installation
- Or manually add to PATH:
  - System Properties → Environment Variables
  - Add Python install folder to PATH

### "node not recognized"
- Reinstall Node.js
- Restart Command Prompt/PowerShell
- Check PATH includes Node.js

### PowerShell Execution Policy Error
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Cannot activate venv"
```cmd
REM For Command Prompt:
venv\Scripts\activate.bat

REM For PowerShell:
.\venv\Scripts\Activate.ps1
```

### Microphone Not Working
1. Windows Settings → Privacy → Microphone
2. Enable microphone access for apps
3. Allow desktop apps to access microphone

### Slow Transcription
- Use smaller model: "Tiny" or "Base"
- Or upgrade to API mode (faster, costs $0.36/hour)

---

## 📊 Performance on Windows

### Recommended Models by Hardware:

**Low-end (4GB RAM, 2 cores):**
- Use: `tiny` or `base`
- Speed: Real-time or faster

**Mid-range (8GB RAM, 4 cores):**
- Use: `small` ⭐ Recommended
- Speed: 2-3x slower than real-time

**High-end (16GB RAM, 8+ cores):**
- Use: `medium` or `large-v3`
- Speed: 3-6x slower than real-time
- Best quality!

---

## 🎯 Development Commands

```cmd
REM Run app in development
npm run app:dev

REM Type check
npm run type-check

REM Build for production
npm run build

REM Build for Windows only
npm run build:win
```

---

## 📁 Windows File Locations

**App Data:**
```
%APPDATA%\whisnotes\
```

**Whisper Models Cache:**
```
%USERPROFILE%\.cache\whisper\
```

**Database:**
```
%APPDATA%\whisnotes\meetings.db
```

---

## 💡 Windows Tips

1. **Use PowerShell or Windows Terminal** - Better than old Command Prompt
2. **Install Windows Terminal** from Microsoft Store - Much nicer
3. **Pin to Taskbar** after first run for quick access
4. **Check Firewall** if network features don't work
5. **Use .en models** if English-only (better quality)

---

## 🎉 You're Ready!

**Quick Start:**
```cmd
start.bat
```

**Or Manual:**
```cmd
venv\Scripts\activate.bat
npm run app:dev
```

**Enjoy FREE AI transcription on Windows!** 🪟🚀

---

## ⭐ Coming Soon for Windows

- [ ] System Audio Capture (WASAPI)
- [ ] Windows-specific optimizations
- [ ] MSI installer
- [ ] Auto-update support

Stay tuned! ⚡
