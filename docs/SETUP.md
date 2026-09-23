# WhisNotes — Complete Setup Guide

## Prerequisites

| Requirement | macOS | Windows | Linux |
|---|---|---|---|
| Node.js 22 LTS | `brew install node@22` | [nodejs.org](https://nodejs.org) | `apt install nodejs` |
| Python 3.8+ | Built-in | [python.org](https://python.org) | `apt install python3` |
| SoX | `brew install sox` | [sourceforge.net/projects/sox](https://sourceforge.net/projects/sox) | `apt install sox` |
| git | Built-in | [git-scm.com](https://git-scm.com) | `apt install git` |

---

## Step 1: Clone

```bash
git clone https://github.com/panosnet/whisnotes.git
cd whisnotes
```

---

## Step 2: Python Environment

WhisNotes uses a Python virtual environment so the Whisper package doesn't conflict with your system Python.

```bash
# Create the virtual environment
python3 -m venv venv

# Activate it (macOS/Linux)
source venv/bin/activate

# Activate it (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Install Whisper (free, runs locally)
pip install openai-whisper
```

**Optional — for speaker diarization (who said what):**
```bash
pip install whisperx
```
WhisperX requires a free [HuggingFace token](https://huggingface.co/settings/tokens). You'll enter it in Settings → Transcription → Speaker Diarization.

---

## Step 3: Node Dependencies

```bash
npm install
```

This also runs `postinstall` which rebuilds native modules (better-sqlite3) for your Electron version.

---

## Step 4: Native Audio Module (macOS only)

For system audio capture (Google Meet, Zoom, YouTube, etc.):

```bash
npm run build:native
```

This compiles the ScreenCaptureKit Objective-C++ addon.

**Requirements:** Xcode Command Line Tools
```bash
xcode-select --install
```

---

## Step 5: Launch

```bash
npm start
```

The first launch opens the home screen. You don't need API keys for basic transcription.

---

## Step 6: Download a Whisper Model

1. Open **Settings** (gear icon in sidebar)
2. Go to **Transcription**
3. The app shows your system specs and recommends a model
4. Click **Download** next to your chosen model
5. Wait for the progress bar to complete (75 MB – 2.9 GB depending on model)

**Recommendations:**
- **Low RAM (4 GB):** tiny or base
- **Standard (8 GB):** small ⭐ (recommended)
- **High RAM (16 GB+):** medium or large-v3

Models are cached at `~/.cache/whisper/` and reused across sessions.

---

## Step 7: System Audio Permission (macOS)

To capture Google Meet, Zoom, Slack, YouTube, etc.:

1. Click **Record** → select **System Audio (Meetings, Videos)**
2. WhisNotes automatically opens System Settings if permission is missing
3. In System Settings → **Privacy & Security → Screen Recording**
4. Enable your terminal app (iTerm, Terminal, Warp, etc.)
5. Click **Record** again — system audio now works

---

## Optional: AI Analysis Setup

For meeting summaries and action items, configure an AI provider in **Settings → AI Providers**:

### Option A: Ollama (Free, 100% Local — Recommended)

1. Download Ollama from [ollama.ai](https://ollama.ai)
2. Install and run it
3. Pull a model:
   ```bash
   ollama pull llama3       # 6 GB RAM needed
   ollama pull mistral      # 6 GB RAM needed
   ollama pull phi3         # 4 GB RAM needed (smaller, faster)
   ```
4. In WhisNotes Settings → AI Providers → **Ollama**
5. App auto-detects running Ollama and lists your models

### Option B: Anthropic Claude

1. Get an API key at [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. Settings → AI Providers → **Claude**
3. Settings → API Keys → paste key

### Option C: OpenAI GPT-4

1. Get an API key at [platform.openai.com](https://platform.openai.com/api-keys)
2. Settings → AI Providers → **GPT-4**
3. Settings → API Keys → paste key

---

## Troubleshooting

### App shows "Python not found"
Make sure you ran `source venv/bin/activate` before `npm start`. Or restart the app — it finds the venv automatically if it exists in the project folder.

### "SoX not found" error
```bash
# macOS
brew install sox

# Ubuntu/Debian
sudo apt install sox

# Fedora
sudo dnf install sox
```

### No system audio option on macOS
The native module may not be compiled. Run:
```bash
npm run build:native
```

### TypeScript compilation errors
```bash
npx tsc --project tsconfig.node.json
```

### Native module version mismatch after npm install
```bash
npm run rebuild
```

### Slow transcription
- Use a smaller model (tiny/base)
- Enable WhisperX for faster inference on Apple Silicon (uses Metal GPU)
- Or switch to OpenAI Whisper API in Settings (fastest, paid)

### Ollama connection refused
Make sure Ollama is running:
```bash
ollama serve
```

Or it should start automatically after installation on macOS/Windows.

---

## Data Locations

| Platform | Data directory |
|---|---|
| macOS | `~/Library/Application Support/whisnotes/` |
| Windows | `%APPDATA%\whisnotes\` |
| Linux | `~/.config/whisnotes/` |

Contents:
- `whisnotes.db` — all meetings, transcripts, notes, tags, calendar
- `recordings/` — WAV audio files (one per meeting, for playback)

Whisper models: `~/.cache/whisper/`
