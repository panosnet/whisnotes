# 🚀 WhisNotes Quick Start Guide

## ⚡ Super Quick Start

**Already set up? Just run:**
```bash
npm start
```

**Or:**
```bash
./start.sh
```

That's it! One command! 🎉

---

## 🎯 What Can WhisNotes Do?

### 1. 🎤 Record Your Voice
- Voice notes
- Dictation
- Memos
- **No permissions needed!**

### 2. 💼 Record Meetings (YOU + Everyone!)
- **Google Meet** - Your voice + all participants ✅
- **Zoom** - Full meeting transcription ✅
- **Slack Huddles** - Team conversations ✅
- **Microsoft Teams** - Complete calls ✅
- **Discord** - Voice channels ✅

### 3. 📺 Transcribe Videos & Audio
- **YouTube videos** - Educational content, tutorials
- **Netflix/Prime** - Movie/show dialogue
- **Podcasts** - Get text transcripts
- **Online courses** - Coursera, Udemy lectures
- **Audiobooks** - Text version
- **Music** - Song lyrics (works best with clear vocals)

### 4. 🌍 Multi-Language
- 99+ languages supported
- English, Greek, Czech, Spanish, French, German, Japanese...
- Auto-detection available

---

## 🔧 First Time Setup (5 Minutes)

### Step 1: Install System Dependencies

**macOS:**
```bash
# Node.js 22 LTS
brew install node@22
brew link node@22 --force

# SoX for audio
brew install sox

# Python for FREE local Whisper
python3 -m venv venv
source venv/bin/activate
pip install openai-whisper
```

### Step 2: Install & Build

```bash
# Install packages
npm install

# Build native modules (macOS system audio)
npm run build:native
```

### Step 3: Grant Permission (For System Audio)

**To record meetings/videos (one-time):**
1. Open **System Settings**
2. Go to **Privacy & Security** → **Screen Recording**
3. Enable **"Electron"** (appears after first run)

**Skip this if you only want microphone mode!**

### Step 4: Run!

```bash
npm start
```

**Or:**
```bash
./start.sh
```

---

## 🎮 Using WhisNotes

### Configure Settings

1. Click **Settings** ⚙️ icon (bottom of sidebar)
2. See your **system specs** (CPU, RAM)
3. Check **recommended Whisper model** ⭐
4. Select **"Local FREE"** mode (default)
5. Choose model: **"Small (Multilingual)"** recommended
6. Click **Save Settings**

### Record Your Voice

1. Click **Microphone** 🎤 icon
2. Select **"Microphone (Your Voice)"**
3. Click **Start Recording**
4. Speak!
5. Click **Stop Recording**
6. View transcript ✨

### Record a Meeting

**Captures YOUR voice + ALL participants!**

1. Click **Microphone** 🎤 icon
2. Select **"System Audio (Google Meet, Slack, Zoom)"**
3. Click **Start Recording**
4. Join your meeting (Google Meet, Zoom, etc.)
5. Participate normally - talk, listen, discuss
6. Click **Stop Recording** when done
7. **Full meeting transcript** with everyone! 🎉

### Transcribe a YouTube Video

1. Click **Microphone** 🎤 icon
2. Select **"System Audio"**
3. Click **Start Recording**
4. Open YouTube and play video
5. Click **Stop Recording** when done
6. Get full video transcript! 📺

### View Your Meetings

1. Click **Meetings** 📄 icon
2. See all recordings
3. Click any meeting to view:
   - Full transcript
   - Timestamps
   - Duration
   - Language detected
   - Add notes

### Check Calendar

1. Click **Calendar** 📅 icon
2. See monthly view with:
   - Total meetings per month
   - Total time spent
   - Average meetings per day
   - Most productive day
   - Starred meetings
3. Click any day for details
4. View all meetings that day

---

## 💡 Tips & Tricks

### Best Whisper Model for You

**Your system has:**
- Check Settings ⚙️ to see CPU, RAM, recommendations

**Model recommendations:**
- **Tiny/Base** (75-142 MB) - Fast, basic quality, low-end systems
- **Small** ⭐ (466 MB) - **RECOMMENDED** for most users
- **Medium** (1.5 GB) - High quality, slower, needs 8+ GB RAM
- **Large V3** (2.9 GB) - Best quality, very slow, needs 16+ GB RAM

**English-only models (.en):**
- Better quality if you only transcribe English
- Faster processing
- More accurate

### Recording Best Practices

**For Meetings:**
- ✅ Use headphones (prevents echo)
- ✅ Start recording BEFORE joining
- ✅ Let it run the whole meeting
- ✅ Good internet = better audio quality
- ⚠️ Inform participants (legal requirement in many places)

**For Videos:**
- ✅ Pause recording when navigating/switching videos
- ✅ Close other tabs to avoid capturing sounds
- ✅ Adjust volume for clear audio

**For Voice Notes:**
- ✅ Speak clearly
- ✅ Reduce background noise
- ✅ Use microphone mode (no permissions needed)

### Performance Tips

- **Small model** - Best balance (recommended)
- **Tiny model** - If transcription is slow
- **Medium/Large** - If you have powerful system
- **API mode** - Fastest ($0.36/hour) but costs money

---

## 🐛 Troubleshooting

### App Won't Start

```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
npm run build:native
npm start
```

### System Audio Crashes

**Problem:** Didn't grant Screen Recording permission
**Solution:**
1. System Settings → Privacy & Security → Screen Recording
2. Enable "Electron"
3. Restart app

**Alternative:** Use "Microphone (Your Voice)" mode instead!

### No Audio Captured

**Microphone:**
- Check System Settings → Privacy → Microphone
- Enable for Electron/Terminal

**System Audio:**
- Check Screen Recording permission
- Verify audio is playing (try Microphone mode first)
- macOS 13+ required

### Slow Transcription

- Choose smaller model (Tiny or Base)
- Or use Whisper API mode (paid but fast)
- Check system has enough RAM

### "SoX not found"

```bash
brew install sox
```

### "Python/Whisper error"

```bash
source venv/bin/activate
pip install openai-whisper
```

---

## 📊 What Gets Captured

### System Audio Mode Captures:

✅ **Your voice** in meetings (as meeting app plays it back)
✅ **All participants** speaking
✅ **Screen share audio**
✅ **Video playback** (YouTube, Netflix, etc.)
✅ **Music, podcasts, audiobooks**
✅ **Any audio from any app**

### Microphone Mode Captures:

✅ **Only your voice** from microphone
✅ **In-person conversations** 
✅ **Voice memos**
✅ **Dictation**

---

## 🎯 Common Use Cases

### Business Meeting Transcription
```
1. Start System Audio recording
2. Join Google Meet/Zoom
3. Participate in meeting
4. Stop recording after meeting
5. Get full transcript of discussion
```

### YouTube Tutorial Notes
```
1. Start System Audio recording
2. Play tutorial video
3. Let it run
4. Get searchable text notes
```

### Podcast Transcription
```
1. Start System Audio recording
2. Play podcast
3. Get full text transcript
```

### Voice Memo
```
1. Start Microphone recording
2. Speak your thoughts
3. Get organized text
```

---

## 🎉 You're Ready!

**Start now:**
```bash
npm start
```

**Explore:**
- ⚙️ Settings - Configure and see system info
- 🎤 Microphone - Record voice or system audio
- 📄 Meetings - View all transcripts
- 📅 Calendar - Analytics and summaries

**FREE unlimited transcription with local Whisper!** 🚀✨

---

## 📚 More Help

- **Full documentation:** `README.md`
- **Platform guide:** `PLATFORMS.md`
- **Windows setup:** `WINDOWS_SETUP.md`
- **Detailed run guide:** `RUN_GUIDE.md`

**Questions? Check the docs or open an issue!**
