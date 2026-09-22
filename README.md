# WhisNotes

**Free, private, local AI meeting transcription for macOS, Windows, and Linux.**

Record your meetings, interviews, lectures, or any audio — and get an accurate transcript in seconds, with AI-powered summaries, action items, and full-text search. Everything runs on your machine. No subscriptions. No cloud.

![WhisNotes Screenshot](docs/screenshot.png)

---

## Why WhisNotes?

- **100% Free** — uses [OpenAI Whisper](https://github.com/openai/whisper) locally. No API key needed.
- **Private by default** — your audio and transcripts never leave your computer.
- **Captures everything** — microphone, Google Meet, Zoom, Slack, YouTube, any app audio.
- **AI-powered** — summaries, action items, and translation via Ollama (free & local), Claude, or GPT-4.
- **Global shortcut** — `⌘⌥R` starts/stops recording from any app.

---

## Features

| Feature | Details |
|---|---|
| **Real-time transcription** | Words appear seconds after you speak, using Whisper's VAD |
| **11 Whisper models** | From 75 MB (tiny) to 2.9 GB (large-v3) — auto-recommended for your hardware |
| **System audio capture** | Captures Google Meet, Zoom, Slack, YouTube, any browser tab (macOS 13+) |
| **Microphone recording** | Works on all platforms, no permissions needed |
| **AI analysis** | Summary, key points, action items, topics — via Ollama/Claude/GPT-4 |
| **Translation** | Translate any transcript to any language using your configured AI |
| **Full-text search** | Search across all your transcripts instantly with SQLite FTS5 |
| **Inline editing** | Fix Whisper mistakes directly in the transcript |
| **5 export formats** | Text, Markdown, JSON, SRT subtitles, PDF |
| **Copy to clipboard** | One-click copy as plain text or Markdown for Notion/Obsidian |
| **Notes system** | 5 note types (action, decision, question, idea, general) with pin & edit |
| **Calendar view** | Monthly overview with meeting stats and day summaries |
| **Star & organize** | Star important meetings, search by title or transcript content |
| **Download manager** | Download Whisper models directly from settings with progress bar |
| **Hardware detection** | Automatically recommends the best model for your CPU/RAM |
| **Ollama integration** | Auto-detects running Ollama instance and lists installed models |
| **Global shortcut** | `⌘⌥R` to start/stop recording from any app |
| **Privacy first** | No telemetry, no analytics, no cloud sync |

---

## Quick Start

### Prerequisites

**macOS (recommended):**
```bash
# Install Homebrew dependencies
brew install node@22 sox

# Set up Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install openai-whisper
```

**Windows:**
- Install [Node.js 22 LTS](https://nodejs.org/) (check "Add to PATH")
- Install [Python 3.8+](https://python.org/) (check "Add to PATH")
- Open PowerShell and run:
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  pip install openai-whisper
  ```

### Install & Run

```bash
# Clone the repo
git clone https://github.com/panosnet/whisnotes.git
cd whisnotes

# Install dependencies
npm install

# Build native audio module (macOS only — for system audio capture)
npm run build:native

# Start the app
npm start
```

The app opens automatically. On first launch:
1. Go to **Settings** → choose your Whisper model (Small is recommended)
2. Click **Record** → select audio source → start talking

---

## System Audio Capture (macOS)

To capture Google Meet, Zoom, Slack, YouTube, and other app audio:

1. Start the app once (so macOS registers the permission request)
2. Open **System Settings** → **Privacy & Security** → **Screen Recording**
3. Enable **iTerm** (or your terminal emulator)
4. Restart the app — System Audio option appears in the device dropdown

Now you can capture everything playing on your Mac including meetings you participate in.

---

## AI Analysis & Translation

WhisNotes works with multiple AI providers for analysis and translation:

| Provider | Cost | Setup |
|---|---|---|
| **Ollama** ⭐ | Free, 100% local | [Install Ollama](https://ollama.ai) → `ollama pull llama3` |
| **Claude** | ~$0.25/1M tokens | Add Anthropic API key in Settings |
| **GPT-4** | ~$0.15/1M tokens | Add OpenAI API key in Settings |

Settings auto-detects running Ollama instances and recommends models based on your RAM.

---

## Whisper Models

| Model | Size | Speed | Quality | Best For |
|---|---|---|---|---|
| tiny | 75 MB | ⚡⚡⚡ | Good | Real-time, low-end hardware |
| base | 142 MB | ⚡⚡⚡ | Good | Fast & lightweight |
| **small** ⭐ | 466 MB | ⚡⚡ | Great | **Most users — best balance** |
| medium | 1.5 GB | ⚡ | Excellent | Professional transcription |
| large-v3 | 2.9 GB | 🐢 | Best | Maximum accuracy |

English-only variants (`.en`) are faster and more accurate for English content.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘⌥R` | Start/stop recording (works from any app) |
| `⌘Enter` | Save note or transcript edit |
| `⌘⌥I` | Open developer tools |

---

## Architecture

```
whisnotes/
├── electron/                 # Electron main process
│   ├── main.ts               # App entry, global shortcuts
│   ├── preload.cjs           # IPC bridge (secure channel allowlist)
│   ├── ipc/                  # IPC handlers (audio, meetings, export, etc.)
│   └── services/
│       ├── audio-capture/    # VAD + microphone + ScreenCaptureKit
│       ├── ai/               # Whisper, analysis, translation services
│       └── database/         # SQLite + repositories + FTS5 search
├── src/                      # React frontend
│   ├── components/           # CaptureView, MeetingDetail, Calendar, etc.
│   └── stores/               # Zustand state management
├── native/macos/             # Objective-C++ ScreenCaptureKit addon
│   └── screen_capture_kit.mm
├── whisper_server.py         # Persistent Whisper subprocess (keeps model in RAM)
└── package.json
```

**How transcription works:**
1. VAD (Voice Activity Detection) detects speech and sends 400ms-silence-triggered chunks
2. Audio chunk → WAV file → sent to persistent `whisper_server.py` via stdin pipe
3. Whisper model stays loaded in RAM — no reload delay between segments
4. JSON result → saved to SQLite → pushed to UI via IPC

---

## Building from Source

```bash
# Development
npm start

# Build native macOS audio module
npm run build:native

# Rebuild native modules after npm install
npm run rebuild

# Production build
npm run build
```

---

## Privacy

- **No telemetry** — zero analytics or usage tracking
- **No cloud** — all data stays in `~/Library/Application Support/whisnotes/` (macOS)
- **No API calls** unless you configure OpenAI/Anthropic keys (optional)
- **Open source** — audit everything yourself

---

## Contributing

Pull requests welcome! Please open an issue first for major changes.

**Areas that need work:**
- Windows system audio capture (WASAPI)
- Linux system audio capture (PulseAudio/PipeWire)
- Speaker diarization via WhisperX
- iOS/Android companion app

---

## License

MIT — free to use, modify, and distribute.

---

## Acknowledgements

Built with:
- [OpenAI Whisper](https://github.com/openai/whisper) — open-source speech recognition
- [Electron](https://electronjs.org) — cross-platform desktop framework
- [ScreenCaptureKit](https://developer.apple.com/documentation/screencapturekit) — macOS system audio
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — fast local database
- [Ollama](https://ollama.ai) — local AI model runner
