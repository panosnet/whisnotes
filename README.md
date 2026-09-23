# WhisNotes

**Free, private, local AI meeting transcription for macOS, Windows, and Linux.**

Record meetings, interviews, lectures, or any audio — get an accurate transcript in seconds, with AI-powered summaries, action items, full-text search, and audio playback. Everything runs on your machine. No subscriptions. No cloud.

---

## Features

| | Feature | Details |
|---|---|---|
| 🎙️ | **Real-time transcription** | Words appear seconds after you speak via Voice Activity Detection |
| 🖥️ | **System audio capture** | Capture Google Meet, Zoom, Slack, YouTube, any app — macOS 13+, Windows, Linux |
| 🆓 | **11 Whisper models** | From 75 MB (tiny) to 2.9 GB (large-v3) — auto-recommended for your hardware |
| 🎵 | **Audio playback** | Re-listen to any recording; transcript highlights in sync with playback |
| 👥 | **Speaker diarization** | "Speaker 1:", "Speaker 2:" labels per segment via WhisperX (optional) |
| 🤖 | **AI analysis** | Summary, key points, action items, topics — via Ollama (free/local), Claude, or GPT-4 |
| 🌍 | **Translation** | Translate any transcript using your configured AI provider |
| 🔍 | **Full-text search** | Search across all transcripts instantly with SQLite FTS5 |
| ✏️ | **Inline editing** | Fix Whisper mistakes directly in the transcript |
| 📤 | **5 export formats** | Text, Markdown, JSON, SRT subtitles, PDF |
| 📋 | **Copy to clipboard** | One-click copy as plain text or Markdown for Notion/Obsidian |
| 🏷️ | **Tags** | Color-coded tags on any meeting with autocomplete |
| 📝 | **Notes** | 5 note types (action, decision, question, idea, general) with pin & edit |
| 📅 | **Calendar** | Month and Week views with meeting stats |
| ⌨️ | **Global shortcut** | `⌘⌥R` starts/stops recording from any app |
| 🔒 | **Privacy first** | No telemetry, no analytics, no cloud sync — everything local |

---

## Quick Start

### macOS (recommended)

```bash
# 1. Install system dependencies
brew install node@22 sox

# 2. Clone and enter project
git clone https://github.com/panosnet/whisnotes.git
cd whisnotes

# 3. Set up Python for FREE local transcription
python3 -m venv venv
source venv/bin/activate
pip install openai-whisper

# 4. Install Node dependencies
npm install

# 5. Build native audio module (for system audio capture)
npm run build:native

# 6. Start
npm start
```

### Windows

```powershell
# Install Node.js 22 LTS from nodejs.org (check "Add to PATH")
# Install Python 3.8+ from python.org (check "Add to PATH")

git clone https://github.com/panosnet/whisnotes.git
cd whisnotes

python -m venv venv
.\venv\Scripts\Activate.ps1
pip install openai-whisper

npm install
npm start
```

### Linux

```bash
# Ubuntu/Debian
sudo apt install nodejs npm sox

# Fedora/RHEL
sudo dnf install nodejs npm sox

git clone https://github.com/panosnet/whisnotes.git
cd whisnotes

python3 -m venv venv
source venv/bin/activate
pip install openai-whisper

npm install
npm start
```

---

## First Launch

On first launch:

1. **Settings → Transcription** — the app recommends the best Whisper model for your hardware. Click **Download** next to your chosen model (Small is recommended for most users).
2. **Click Record** in the sidebar — select your audio source (microphone or system audio).
3. **Start talking** — transcript appears in seconds.

---

## Audio Sources

### Microphone
Works on all platforms, no extra permissions needed. Use this for:
- Voice memos and dictation
- In-person meetings and conversations
- Interviews where you control the recording

### System Audio (capture everything playing on your computer)
Use this for:
- Google Meet, Zoom, Slack Huddles, Microsoft Teams
- YouTube, podcasts, online courses
- Any app playing audio

**macOS setup (one-time):**
1. Start WhisNotes once so macOS registers it
2. **System Settings → Privacy & Security → Screen Recording**
3. Enable your terminal app (iTerm, Terminal, etc.)
4. Restart WhisNotes

When System Audio is selected, WhisNotes automatically opens System Settings if permission is missing.

**Windows:** System Audio uses WASAPI loopback via Electron — select "System Audio (All Apps)" from the device list.

**Linux:** WhisNotes detects PulseAudio monitor sources automatically. Select the `.monitor` source for your output device.

---

## Whisper Models

| Model | Size | Speed | Quality | Best For |
|---|---|---|---|---|
| tiny | 75 MB | ⚡⚡⚡ | Good | Low-end hardware, quick notes |
| tiny.en | 75 MB | ⚡⚡⚡ | Good | English only, fastest |
| base | 142 MB | ⚡⚡⚡ | Good | Fast and lightweight |
| base.en | 142 MB | ⚡⚡⚡ | Good | English only |
| **small** ⭐ | 466 MB | ⚡⚡ | Great | **Recommended — best balance** |
| small.en | 466 MB | ⚡⚡ | Great | English only, more accurate |
| medium | 1.5 GB | ⚡ | Excellent | Professional, handles accents |
| medium.en | 1.5 GB | ⚡ | Excellent | English only |
| large | 2.9 GB | 🐢 | Best | Maximum accuracy |
| large-v2 | 2.9 GB | 🐢 | Best | Improved large |
| large-v3 | 2.9 GB | 🐢 | Best | Latest, most accurate |

Models download to `~/.cache/whisper/` and are kept in RAM between segments (no reload delay).

**Download models** directly from Settings → Transcription — live progress bar, cancel anytime.

---

## Speaker Diarization (Who Said What)

WhisNotes can label each segment with the speaker: "Speaker 1:", "Speaker 2:", etc.

**Setup:**
```bash
source venv/bin/activate
pip install whisperx
```

Then in **Settings → Transcription → Speaker Diarization**:
- Enable the toggle
- Add your free [HuggingFace token](https://huggingface.co/settings/tokens) (required by pyannote)
- Accept the [pyannote speaker diarization license](https://huggingface.co/pyannote/speaker-diarization-3.1)

After enabling, each transcript segment shows a color-coded speaker badge. Click the badge to rename "Speaker 1" to a real name.

**Note:** Diarization adds ~2–5 seconds per audio chunk. Use with `small` or `medium` model for best speed/accuracy balance.

---

## AI Analysis & Translation

After recording, click **Analyze** in any meeting to get:
- **Summary** — 2–3 sentence overview
- **Key Points** — bullet-point highlights
- **Action Items** — tasks with priority levels
- **Topics** — main themes discussed

Translation: click **Translation** to translate the full transcript.

Both features use your configured AI provider:

| Provider | Cost | Quality | Setup |
|---|---|---|---|
| **Ollama** ⭐ | Free, 100% local | Great | [Install Ollama](https://ollama.ai) → `ollama pull llama3` |
| **Claude** | ~$0.25/1M tokens | Excellent | Add Anthropic API key in Settings |
| **GPT-4** | ~$0.15/1M tokens | Excellent | Add OpenAI API key in Settings |

**Ollama setup:** Settings → AI Providers → Ollama. The app auto-detects running Ollama instances and recommends models based on your RAM. A model is suggested and auto-selected when you first switch to Ollama.

---

## Audio Playback

Every recording is saved to disk automatically. In any past meeting:
- An **audio player** appears below the header
- Click **play** — the current transcript segment highlights in sync
- Click any **timestamp** in the transcript to jump to that moment
- Recordings saved to: `~/Library/Application Support/whisnotes/recordings/` (macOS)

---

## Tags

Add color-coded tags to any meeting for quick filtering and organization:
- Click the **+ Tag** button in the meeting header
- Type to search existing tags or create a new one
- Tags auto-suggest from your tag library
- Click a tag's × button to remove it

---

## Notes

5 note types, all attached to the meeting:
- **General** — free-form notes
- **Question** — things to follow up on
- **Action** — tasks and to-dos
- **Decision** — decisions made
- **Idea** — ideas to explore

Pin important notes to keep them at the top. Edit any note in place. `Cmd+Enter` saves.

---

## Search

The search box in the Meetings list searches **both** meeting titles and transcript content using SQLite full-text search. Type any word spoken in a meeting — it appears in results.

---

## Export

From any meeting detail, click **Export**:

| Format | Contents | Use for |
|---|---|---|
| **Text (.txt)** | `[MM:SS] transcript text` | Quick sharing, plain notes |
| **Markdown (.md)** | Formatted with headers | Notion, Obsidian, wikis |
| **JSON (.json)** | Full meeting + segments data | Developers, integrations |
| **SRT (.srt)** | Subtitle file | Adding captions to video |
| **PDF (.pdf)** | Formatted document | Formal records, email |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘⌥R` | Start/stop recording (works from any app) |
| `⌘Enter` | Save note or transcript edit |
| `⌘⌥I` | Open developer console |
| `Esc` | Cancel inline edit |

---

## Calendar

The calendar shows all your meetings with stats. Switch between **Month** and **Week** views.

- Click any day to see that day's meetings in a sidebar
- Click a meeting card to open it
- **Today** button navigates to today and opens the day panel
- Month stats: total meetings, total time, average per day, starred count

---

## Settings Reference

### Transcription
- **Mode** — Local FREE (Whisper on your Mac) or OpenAI API (paid, faster)
- **Model** — 11 models with hardware-aware recommendations and download manager
- **Speaker Diarization** — label speakers with WhisperX (requires extra setup)

### AI Providers
- Used for Analysis and Translation
- **None** — disable AI features
- **Ollama** — free local AI (auto-detects models, hardware-aware suggestions)
- **Claude** — Anthropic API (requires key)
- **GPT-4** — OpenAI API (requires key)

### API Keys
- OpenAI and Anthropic keys stored locally, never transmitted anywhere except to their respective APIs
- Keys persist across restarts

### Language
- Default language for new recordings
- Auto-detect (Whisper detects per segment)
- English, Greek (Ελληνικά), Czech (Čeština)

### Appearance
- Light / Dark / System theme

---

## Privacy & Data

- **No telemetry** — zero usage tracking or analytics
- **No cloud** — all data stays on your machine
- **No internet required** — works fully offline (except API modes)
- **Data location** (macOS): `~/Library/Application Support/whisnotes/`
  - `whisnotes.db` — all meetings, transcripts, notes, tags
  - `recordings/` — WAV files for audio playback
- **Model cache**: `~/.cache/whisper/` — downloaded Whisper models

---

## Troubleshooting

### "SoX not found"
```bash
brew install sox          # macOS
sudo apt install sox      # Ubuntu/Debian
sudo dnf install sox      # Fedora
```

### "Python/Whisper not found"
```bash
source venv/bin/activate   # macOS/Linux
pip install openai-whisper
```

### No transcript appearing
1. Check the terminal for `[Whisper]` log lines — they show the Python path and script location
2. Make sure you've downloaded a model in Settings → Transcription
3. Try the `tiny` model first (fastest to load)

### System audio not working (macOS)
1. System Settings → Privacy & Security → Screen Recording
2. Enable your terminal app
3. Restart WhisNotes — it will auto-open System Settings if permission is still missing

### System audio not working (Windows)
- Ensure "Stereo Mix" or "What You Hear" is enabled in Windows Sound settings
- Or install [VB-Audio Virtual Cable](https://vb-audio.com/Cable/) as a virtual loopback

### System audio not working (Linux)
- Ensure PulseAudio is running: `pulseaudio --check`
- List monitor sources: `pactl list sources short | grep monitor`
- The monitor source appears automatically in the device list if PulseAudio is active

### App won't start
```bash
rm -rf dist-electron dist
npm install
npm run build:native
npm start
```

### Native module error (better-sqlite3 version mismatch)
```bash
npm run rebuild
```

---

## Building & Development

```bash
npm start              # Development mode (Vite + Electron)
npm run build:native   # Compile ScreenCaptureKit addon (macOS)
npm run rebuild        # Rebuild native modules after npm install
npm run type-check     # TypeScript check without building
npm run build          # Production build
```

**Project structure:**
```
whisnotes/
├── electron/                 # Electron main process (TypeScript)
│   ├── main.ts               # Entry point, shortcuts, overlay window
│   ├── preload.cjs           # Secure IPC bridge
│   ├── ipc/                  # IPC handlers
│   └── services/             # Audio, AI, database services
├── src/                      # React frontend (TypeScript)
│   ├── components/           # UI components
│   └── stores/               # Zustand state
├── native/macos/             # Objective-C++ ScreenCaptureKit addon
├── whisper_server.py         # Persistent Whisper/WhisperX subprocess
└── public/overlay.html       # Floating recorder overlay
```

See [`CODEBASE_MAP.md`](CODEBASE_MAP.md) for a complete file-by-file reference.

---

## Roadmap

- [x] Real-time transcription (Whisper local)
- [x] System audio capture (macOS, Windows, Linux)
- [x] AI analysis (Ollama, Claude, GPT-4)
- [x] Translation
- [x] Speaker diarization (WhisperX)
- [x] Audio playback with transcript sync
- [x] Full-text search (SQLite FTS5)
- [x] Tags, Notes, Calendar
- [x] Export (Text, Markdown, JSON, SRT, PDF)
- [x] Global keyboard shortcut
- [x] Floating mini recorder overlay
- [ ] Mobile companion app (iOS/Android)
- [ ] Automatic meeting detection (detect Google Meet/Zoom by window title)
- [ ] Shared meeting transcripts (read-only link)
- [ ] Word-level timestamp highlighting

---

## Contributing

Pull requests welcome. Please open an issue first for major changes.

---

## License

MIT — free to use, modify, and distribute.

---

## Acknowledgements

- [OpenAI Whisper](https://github.com/openai/whisper) — open-source speech recognition
- [WhisperX](https://github.com/m-bain/whisperX) — word-level timestamps + speaker diarization
- [Electron](https://electronjs.org) — cross-platform desktop framework
- [ScreenCaptureKit](https://developer.apple.com/documentation/screencapturekit) — macOS system audio
- [Ollama](https://ollama.ai) — local AI model runner
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — fast local database
