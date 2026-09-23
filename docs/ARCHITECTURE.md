# WhisNotes — Architecture Reference

## Overview

WhisNotes is an Electron desktop app with a React frontend. The backend runs in the Electron main process; the frontend runs in a Chromium renderer. Communication between them happens via secure IPC channels exposed through a `contextBridge` preload script.

```
┌────────────────────────────────────────────────────────┐
│                    Electron App                        │
│                                                        │
│  ┌──────────────────┐    IPC    ┌──────────────────┐  │
│  │  Main Process    │◄─────────►│  Renderer        │  │
│  │  (Node.js)       │           │  (React + Vite)  │  │
│  │                  │  preload  │                  │  │
│  │  - IPC handlers  │◄ bridge ─►│  - Components    │  │
│  │  - Services      │           │  - Zustand stores│  │
│  │  - SQLite DB     │           │  - TypeScript    │  │
│  └──────────────────┘           └──────────────────┘  │
│           │                                            │
│   ┌───────┴────────────────────┐                       │
│   │   External processes       │                       │
│   │   whisper_server.py        │ ← persistent Python   │
│   │   native .node addon       │ ← ScreenCaptureKit    │
│   └────────────────────────────┘                       │
└────────────────────────────────────────────────────────┘
```

---

## Data Flow: Recording → Transcript

```
User speaks
    │
    ▼
AudioCaptureService (VAD engine)
    │  400ms silence detected
    ▼
flushSpeechChunk() → emits 'audio-chunk-ready'
    │
    ▼
audio.ts IPC listener
    │
    ▼
StreamProcessor.processAudioChunk()    ← serial queue
    │
    ▼
WhisperLocalService.transcribe()
    │  creates WAV file
    ▼
whisper_server.py (stdin pipe)         ← model stays in RAM
    │  JSON via stdout
    ▼
TranscriptRepository.create()          ← saved to SQLite
    │
    ▼
webContents.send('transcript:segment') ← pushed to renderer
    │
    ▼
transcriptStore.addSegment()           ← deduplicated by id
    │
    ▼
TranscriptDisplay renders new segment
```

---

## Voice Activity Detection (VAD)

The VAD runs in `AudioCaptureService` on every raw PCM buffer:

```
Buffer arrives
    │
    ├─ Calculate RMS (root mean square) amplitude
    │
    ├─ RMS > 0.01? ─── YES → Speech detected
    │                         │
    │                         ├─ Mark isSpeaking = true
    │                         ├─ Accumulate to speechBuffer
    │                         └─ Cancel any pending silence timer
    │
    └─ RMS ≤ 0.01? ─── NO → Silence
                              │
                              └─ isSpeaking? → Start 400ms timer
                                               │
                                               └─ Timer fires →
                                                  flushSpeechChunk()
                                                  (sends to Whisper)
```

**Constants:**
| Name | Value | Effect |
|---|---|---|
| `SILENCE_RMS_THRESHOLD` | 0.01 | Sensitivity — lower = more sensitive mic |
| `SILENCE_BEFORE_SEND_MS` | 400ms | Pause duration that triggers transcription |
| `MIN_SPEECH_MS` | 200ms | Clips shorter than this are discarded |
| `MAX_CHUNK_MS` | 8000ms | Hard cap — long speech split every 8s |

---

## Whisper Server Protocol

`whisper_server.py` is a long-running Python subprocess. Communication is via stdin/stdout pipes.

**Request (written to stdin):**
```
/tmp/whisnotes-1234.wav|auto|small|0\n
│                       │    │     │
│                       │    │     └── diarize: "1" enables WhisperX
│                       │    └──────── model name
│                       └───────────── language ("auto" = detect)
└───────────────────────────────────── audio file path
```

**Response (read from stdout, one line per request):**
```json
{
  "success": true,
  "text": "Hello, this is a test recording.",
  "language": "en",
  "confidence": 0.87,
  "segments": [
    {"text": "Hello,", "start": 0.0, "end": 0.5, "confidence": 0.92},
    {"text": "this is a test recording.", "start": 0.5, "end": 2.3, "confidence": 0.84}
  ]
}
```

**With diarization enabled:**
```json
{
  "success": true,
  "text": "Hello everyone. Thanks for joining.",
  "language": "en",
  "segments": [
    {"text": "Hello everyone.", "start": 0.0, "end": 1.2, "speaker": "SPEAKER_00", "speakerId": 0},
    {"text": "Thanks for joining.", "start": 2.1, "end": 3.8, "speaker": "SPEAKER_01", "speakerId": 1}
  ]
}
```

**The timeout fix:** Each request stores a timeout handle (`this.timeoutHandle`). On successful response, `clearTimeout(this.timeoutHandle)` is called first — preventing old timeouts from firing against new requests.

---

## IPC Security Model

The preload (`electron/preload.cjs`) enforces two security boundaries:

**1. Typed API surface** (`window.api`)
All IPC calls go through named, typed methods. The caller never knows channel names.

**2. Push channel allowlist** (`window.electron.ipcRenderer`)
Only these channels can be subscribed to:
```javascript
const ALLOWED_PUSH_CHANNELS = new Set([
  'audio:volume', 'transcript:segment', 'transcript:error',
  'shortcut:toggle-recording',
  'models:download-progress', 'models:download-done', 'models:download-error',
])
```

**3. API key protection**
`settings:get-all` omits `openaiApiKey` and `anthropicApiKey` from the response. Keys are only readable via `settings:get('openaiApiKey')` and only written back via the settings panel.

---

## Database Schema

SQLite (WAL mode, foreign keys ON).

```sql
meetings (
  id TEXT PK, title TEXT, start_time DATETIME, end_time DATETIME,
  source_app TEXT, language TEXT, timezone TEXT, location TEXT,
  participants TEXT,  -- JSON array
  duration_seconds INTEGER, recording_path TEXT,
  recording_device TEXT, audio_quality TEXT, notes TEXT,
  is_starred INTEGER, is_archived INTEGER,
  calendar_event_id TEXT, created_at DATETIME, updated_at DATETIME
)

transcript_segments (
  id TEXT PK, meeting_id TEXT → meetings(CASCADE),
  timestamp REAL,       -- seconds from session start
  text TEXT, language TEXT, translation TEXT,
  confidence REAL,      -- 0.0–1.0 from Whisper avg_logprob
  speaker_id INTEGER,   -- NULL = no diarization; 0,1,2... = SPEAKER_00,01,02
  speaker_name TEXT,    -- user-assigned name for the speaker
  is_important INTEGER, notes TEXT,
  created_at DATETIME
)

analysis_results (
  id TEXT PK, meeting_id TEXT → meetings(CASCADE),
  type TEXT,  -- 'full'
  content TEXT,  -- JSON: {summary, keyPoints, actionItems, topics}
  created_at DATETIME
)

notes (
  id TEXT PK, meeting_id TEXT → meetings(SET NULL),
  segment_id TEXT → transcript_segments(SET NULL),
  content TEXT,
  type TEXT,  -- 'general'|'question'|'action'|'decision'|'idea'
  color TEXT, is_pinned INTEGER,
  created_at DATETIME, updated_at DATETIME
)

calendar_events (
  id TEXT PK, meeting_id TEXT → meetings(SET NULL),
  title TEXT, description TEXT, start_time DATETIME, end_time DATETIME,
  timezone TEXT, location TEXT, attendees TEXT, -- JSON
  external_id TEXT, external_source TEXT,
  created_at DATETIME, updated_at DATETIME
)

tags (id TEXT PK, name TEXT UNIQUE, color TEXT, created_at DATETIME)
meeting_tags (meeting_id → meetings(CASCADE), tag_id → tags(CASCADE), PK(both))

-- FTS5 full-text search (auto-synced via triggers)
transcripts_fts USING fts5(text, meeting_id, segment_id)
```

---

## Audio Capture Architecture

### Platform Matrix

| Platform | Microphone | System Audio | Implementation |
|---|---|---|---|
| macOS 13+ | node-record-lpcm16 + SoX | ScreenCaptureKit | Native Obj-C++ addon |
| Windows | node-record-lpcm16 + SoX | desktopCapturer + WebAudio | Hidden BrowserWindow |
| Linux | node-record-lpcm16 + arecord | PulseAudio monitor | `arecord -D .monitor` |

### Audio Format

All sources deliver audio to the pipeline as **16-bit signed integer PCM, 16kHz, mono** (the format Whisper requires).

ScreenCaptureKit delivers float32 PCM — converted to int16 in `SystemAudioMacOS.float32ToInt16()` before entering the VAD.

### Full Recording Buffer

In addition to the VAD buffer (speech-only chunks), `AudioCaptureService` maintains a `fullRecordingBuffer` that accumulates ALL audio data. On `stopCapture()`, this is written to `userData/recordings/{meetingId}.wav` for audio playback in MeetingDetail.

---

## Native Module: ScreenCaptureKit

Located at `native/macos/screen_capture_kit.mm`.

**Key design decisions:**
- All SCK work runs on a dedicated `dispatch_queue` — never blocks the Node.js event loop
- `ThreadSafeFunction` (TSFN) with `atomic<bool> tsfinReleased` guard prevents double-release crashes
- Audio callback captures TSFN via `Acquire()` before the ObjC block — prevents use-after-free when Stop() is called
- `didStopWithError:` propagates mid-recording failures to JS
- Uses `SCContentFilter` with display (not window) — captures ALL app audio and browser tabs
- N-API `startCapture(callback)` is async — returns immediately, callback fires with `null` (success) or error string

**Build:** `npm run build:native` → `native/macos/build/Release/screencapturekit.node`

---

## State Management

### Zustand Stores

| Store | Contents | Notes |
|---|---|---|
| `meetingStore` | `meetings[]`, `currentMeeting`, `currentAnalysis` | `updateMeeting()` syncs both list AND `currentMeeting` |
| `transcriptStore` | `segments[]`, `showTranslation`, `targetLanguage` | `addSegment()` deduplicates by id |
| `audioStore` | `isCapturing`, `devices[]`, `selectedDeviceId`, `volumeLevel` | Session-scoped |
| `settingsStore` | `theme`, `defaultLanguage`, `autoDetectLanguage`, API keys | Loaded from backend on App startup |

### Stale Closure Prevention

CaptureView uses refs alongside state to prevent stale closures in stable event handlers:
```typescript
const isCapturingRef = useRef(isCapturing)
const currentMeetingIdRef = useRef(currentMeetingId)
const elapsedSecondsRef = useRef(elapsedSeconds)

// Kept in sync:
useEffect(() => { isCapturingRef.current = isCapturing }, [isCapturing])
```

`handleStopCapture` reads from refs (not closed-over state) so the global keyboard shortcut correctly saves `endTime` and `durationSeconds`.

---

## Floating Overlay

A second `BrowserWindow` (always-on-top, frameless, 260×60px, transparent) that appears during recording.

- Loaded from `public/overlay.html` — pure HTML/CSS/JS, no React
- Communicates via its own `overlay-preload.cjs`
- Receives: `overlay:start`, `overlay:stop`, `overlay:segment` IPC events
- Sends: `overlay:stop-recording` (user clicks Stop button)
- Main process bridges: `internal:recording-started` → creates overlay; `internal:new-segment` → forwards to overlay; `internal:recording-stopped` → closes overlay after 1.5s

---

## Key Files Quick Reference

| File | What it does |
|---|---|
| `electron/main.ts` | App entry, window creation, global shortcut, overlay lifecycle |
| `electron/preload.cjs` | Secure IPC bridge with channel allowlist |
| `electron/ipc/audio.ts` | Audio start/stop handlers, recording path save |
| `electron/ipc/transcription.ts` | Transcript fetch, update, translate, search |
| `electron/ipc/export.ts` | 5 export formats with file dialogs |
| `electron/ipc/analysis.ts` | AI analysis handler (routes to configured provider) |
| `electron/services/stream-processor.ts` | Transcription queue, routes to Whisper, saves segments |
| `electron/services/ai/whisper-local.ts` | Persistent Python server wrapper, TSFN-cleared timeout |
| `electron/services/ai/analysis.ts` | Multi-provider AI analysis (Ollama/Claude/OpenAI) |
| `electron/services/ai/translation.ts` | Multi-provider translation |
| `electron/services/audio-capture/index.ts` | VAD engine, full recording buffer, platform routing |
| `electron/services/audio-capture/system-audio-macos.ts` | ScreenCaptureKit wrapper, float32→int16 |
| `electron/services/audio-capture/system-audio-linux.ts` | arecord + PulseAudio monitor |
| `electron/services/audio-capture/system-audio-windows.ts` | desktopCapturer + Web Audio in hidden window |
| `electron/services/database/schema.ts` | SQLite init, FTS5 virtual table + triggers |
| `whisper_server.py` | Long-running Whisper/WhisperX process, GPU auto-detect |
| `native/macos/screen_capture_kit.mm` | Obj-C++ ScreenCaptureKit N-API addon |
| `src/App.tsx` | View routing, settings init, theme, shortcut listener |
| `src/components/CaptureView.tsx` | Recording UI, VAD feedback, stable IPC listeners |
| `src/components/MeetingDetail.tsx` | Transcript, audio player, analysis, export, notes, tags |
| `src/components/SettingsPanel.tsx` | All settings, model download manager, Ollama detection |
| `src/components/EnhancedCalendarView.tsx` | Month + Week views with stats |
| `src/components/TagsPanel.tsx` | Tag add/remove with autocomplete |
| `public/overlay.html` | Floating mini recorder (plain HTML, no React) |
