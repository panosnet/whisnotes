# 🖥️ WhisNotes - Platform Support

## 🚀 Quick Start by Platform

### macOS
```bash
./start.sh
```

### Windows
```cmd
start.bat
```

### Linux
```bash
./start.sh
```

---

## ✅ Feature Support Matrix

| Feature | macOS | Windows | Linux |
|---------|-------|---------|-------|
| **Microphone Recording** | ✅ | ✅ | ✅ |
| **System Audio (Meetings)** | ✅ | ⏳ Coming | ⏳ Coming |
| **FREE Local Whisper** | ✅ | ✅ | ✅ |
| **11 Model Options** | ✅ | ✅ | ✅ |
| **99+ Languages** | ✅ | ✅ | ✅ |
| **Hardware Detection** | ✅ | ✅ | ✅ |
| **Model Recommendations** | ✅ | ✅ | ✅ |
| **Notes System** | ✅ | ✅ | ✅ |
| **Calendar View** | ✅ | ✅ | ✅ |
| **Meeting Analytics** | ✅ | ✅ | ✅ |
| **Paid API Mode** | ✅ | ✅ | ✅ |
| **Beautiful UI** | ✅ | ✅ | ✅ |

**Legend:**
- ✅ = Working now
- ⏳ = Coming soon (~2 hours work)
- ❌ = Not supported

---

## 🎤 Audio Capture Details

### macOS ✅ **FULLY WORKING**

**Microphone:**
- ✅ SoX + node-record-lpcm16
- ✅ 16kHz mono PCM
- ✅ Works perfectly

**System Audio:**
- ✅ **ScreenCaptureKit** (macOS 13+)
- ✅ Captures Google Meet, Slack, Zoom
- ✅ High quality audio
- ✅ No virtual cables needed
- ⚠️ Requires Screen Recording permission

**How to use:**
1. Select "System Audio (Google Meet, Slack, Zoom)"
2. Grant Screen Recording permission
3. Join meeting → Start recording → Done! ✨

---

### Windows ⏳ **PARTIAL SUPPORT**

**Microphone:**
- ✅ Works great
- ✅ Same quality as macOS
- ✅ All Whisper models

**System Audio:**
- ⏳ **WASAPI** implementation needed (~2 hours)
- 🔄 Coming very soon!

**Current Workarounds:**

**Option A: Microphone Mode**
```
Meeting speakers → Your mic → WhisNotes ✅
```
- Simple, works now
- Quality depends on room

**Option B: Virtual Audio Cable**
```
Meeting → VB-Cable → WhisNotes ✅
```
- Install VB-Audio Cable (free)
- Better quality
- More setup required

**Option C: Wait**
- WASAPI implementation coming soon
- Will work like macOS

---

### Linux ⏳ **PARTIAL SUPPORT**

**Microphone:**
- ✅ Works with SoX
- ✅ Same as macOS/Windows

**System Audio:**
- ⏳ **PulseAudio/PipeWire** needed (~1.5 hours)
- 🔄 Coming soon!

**Current Workaround:**
- Use `pavucontrol` to route audio
- Or use microphone mode
- Or wait for native support

---

## 📦 Installation Differences

### macOS
```bash
# System dependencies
brew install node@22 sox

# Python setup
python3 -m venv venv
source venv/bin/activate
pip install openai-whisper

# Node setup
npm install
npm run build:native  # ← Builds ScreenCaptureKit

# Run
./start.sh
```

### Windows
```cmd
# Download and install:
# - Node.js 22 from nodejs.org
# - Python 3.8+ from python.org

# Python setup
python -m venv venv
venv\Scripts\activate.bat
pip install openai-whisper

# Node setup
npm install
# No native build needed (yet)

# Run
start.bat
```

### Linux
```bash
# System dependencies (Ubuntu/Debian)
sudo apt install nodejs npm sox

# Or (Fedora/RHEL)
sudo dnf install nodejs npm sox

# Python setup
python3 -m venv venv
source venv/bin/activate
pip install openai-whisper

# Node setup
npm install
# No native build needed (yet)

# Run
./start.sh
```

---

## 🎯 Recommended Configuration by Platform

### macOS
**Best Setup:**
- ✅ Use System Audio for meetings
- ✅ Use Microphone for notes
- ✅ Small or Medium model
- ✅ All features available!

**Optimal for:**
- Google Meet transcription
- Slack Huddles
- Zoom meetings
- Any system audio

### Windows
**Best Setup:**
- ✅ Use Microphone mode
- ✅ Small model (good balance)
- ⏳ System audio coming soon

**Optimal for:**
- Voice notes
- Dictation
- In-person meetings
- (Soon: Online meetings)

### Linux
**Best Setup:**
- ✅ Use Microphone mode
- ✅ Tiny/Base model (faster)
- ⏳ System audio coming soon

**Optimal for:**
- Voice notes
- Terminal sessions
- Recordings
- (Soon: Online meetings)

---

## 🔮 Roadmap

### Phase 1 ✅ **DONE**
- ✅ macOS full support
- ✅ Windows microphone
- ✅ Linux microphone
- ✅ FREE Local Whisper
- ✅ 11 models
- ✅ Beautiful UI

### Phase 2 🔄 **IN PROGRESS**
- 🔄 Windows WASAPI (~2 hours)
- 🔄 Linux PulseAudio (~1.5 hours)
- 🔄 Testing & refinement

### Phase 3 🔮 **PLANNED**
- 📦 macOS .app bundle
- 📦 Windows .exe installer
- 📦 Linux .AppImage/.deb
- 🔄 Auto-updates

---

## 💡 Platform-Specific Tips

### macOS
- Grant Screen Recording permission in System Settings
- Use Command+Q to quit app properly
- Models cached in `~/.cache/whisper/`

### Windows
- Add Python to PATH during install!
- Use Windows Terminal (better than cmd)
- Models cached in `%USERPROFILE%\.cache\whisper\`
- Firewall may ask permission first run

### Linux
- May need `sudo` for audio permissions
- Check PulseAudio is running
- Models cached in `~/.cache/whisper/`
- Use your distro's package manager

---

## 📊 Performance Comparison

**All platforms have similar performance:**

| Model | 8GB RAM | 16GB RAM |
|-------|---------|----------|
| Tiny | Real-time | Real-time |
| Small | 2-3x slower | 2x slower |
| Medium | 4-5x slower | 3-4x slower |
| Large V3 | Too slow | 5-6x slower |

**CPU matters more than platform!**

---

## 🎉 Bottom Line

### macOS Users 🍎
**You have the BEST experience!**
- Everything works perfectly
- System audio capture ready
- No workarounds needed
- 🌟🌟🌟🌟🌟

### Windows Users 🪟
**Almost there!**
- Microphone works great
- System audio coming very soon
- Workarounds available now
- 🌟🌟🌟🌟☆

### Linux Users 🐧
**Core features work!**
- Microphone works
- Local Whisper works
- System audio coming soon
- 🌟🌟🌟🌟☆

---

## 🚀 Start Now on Any Platform!

**macOS:**
```bash
./start.sh
```

**Windows:**
```cmd
start.bat
```

**Linux:**
```bash
./start.sh
```

**All platforms get FREE AI transcription!** 🎉
