# WhisNotes — Complete Codebase Map

A full reference of every file in the project, its purpose, key exports, and how it connects to other parts of the system.

---

## Project Root

```
whisnotes/
├── package.json              # npm scripts, dependencies, Electron config
├── tsconfig.json             # TypeScript config for React/Vite frontend
├── tsconfig.node.json        # TypeScript config for Electron main process
├── vite.config.ts            # Vite bundler config (React only, no electron plugin)
├── tailwind.config.js        # Tailwind CSS config
├── postcss.config.js         # PostCSS config (used by Tailwind)
├── index.html                # Vite HTML entry point
├── electron-builder.json     # Production build config
├── start.sh                  # Quick-start script (macOS/Linux)
├── whisper_server.py         # Persistent Whisper subprocess ← CRITICAL
├── whisper_local.py          # Legacy single-shot whisper script (fallback)
└── .gitignore
```

### Key npm scripts (`package.json`)
| Script | Command | Purpose |
|---|---|---|
| `npm start` | `concurrently "npm run dev" "npm run dev:electron"` | Start app in dev mode |
| `npm run dev` | `vite` | Start Vite dev server on port 5173 |
| `npm run dev:electron` | `tsc + mkdir + cp preload + wait-on + electron .` | Compile Electron, launch app |
| `npm run build:native` | `cd native/macos && npx node-gyp configure && build` | Compile ScreenCaptureKit addon |
| `npm run rebuild` | `electron-rebuild -f -w better-sqlite3 + native rebuild` | Rebuild after npm install |

---

## Python Scripts (Root Level)

### `whisper_server.py` ← Most important script
**Purpose:** Long-running Python process that keeps the Whisper model loaded in RAM.  
Instead of spawning a new process per audio chunk (slow, reloads model each time), this server reads requests from stdin and writes JSON responses to stdout — the model loads once and stays in memory.

**Protocol:** `audio_path|language|model_name\n` → `{"success": true, "text": "...", "language": "...", "confidence": 0.85, "segments": [...]}\n`

**Key behaviour:**
- Detects Apple Silicon (MPS) or CUDA GPU and uses hardware acceleration if available
- Returns per-segment confidence scores derived from `avg_logprob`
- Preserves model between requests — only reloads if model name changes
- All errors are caught and returned as `{"success": false, "error": "..."}`

**Used by:** `electron/services/ai/whisper-local.ts`

### `whisper_local.py`
**Purpose:** Original single-shot transcription script. Now a fallback; `whisper_server.py` is the primary path.  
**Protocol:** `python whisper_local.py <audio_file> <language> <model>`  
**Used by:** Nothing currently (backup only)

---

## Electron Main Process (`electron/`)

### `electron/main.ts`
**Purpose:** Application entry point. Creates the BrowserWindow, enforces single-instance lock, registers the global keyboard shortcut, wires up IPC handlers.

**Key responsibilities:**
- Creates main window (1400×900, hiddenInset title bar, dark background)
- Dev mode: loads from Vite at `http://localhost:5173`
- Production: loads from `dist/index.html`
- Registers `⌘⌥R` global shortcut → sends `shortcut:toggle-recording` to renderer
- Calls `initializeDatabase()`, `registerIPCHandlers()`
- Loads persisted env-check and exposes via `env:check` IPC
- On `before-quit`: unregisters shortcuts, calls `streamProcessor.shutdown()`

**Imports:** `electron/services/database/schema.ts`, `electron/ipc/index.ts`, `electron/services/env-check.ts`, `electron/services/stream-processor.ts`

---

### `electron/preload.cjs` ← Security boundary
**Purpose:** Runs in the renderer's context but has Node.js access. Bridges the renderer and main process securely via `contextBridge`.

**Exposes on `window.api`:**
- `audio` — listDevices, startCapture(deviceId, meetingId, language), stopCapture, onVolumeLevel, onAudioData
- `transcription` — onSegment, translate, getByMeeting, updateText
- `meetings` — create, getAll, getById, update, delete, search
- `analysis` — analyze, getResults
- `settings` — get, set, getAll
- `export` — toJSON, toText, toPDF
- `notes` — create, getByMeeting, getBySegment, update, togglePin, delete
- `calendar` — create, getAll, getByDateRange, getByMeeting, update, delete
- `tags` — create, getAll, getByMeeting, addToMeeting, removeFromMeeting, delete
- `invoke(channel, ...args)` — generic pass-through for any IPC channel

**Exposes on `window.electron`:**
- `ipcRenderer.on(channel, listener)` — only allows whitelisted push channels
- `ipcRenderer.removeListener(channel, listener)`

**Allowed push channels:** `audio:volume`, `transcript:segment`, `transcript:error`, `shortcut:toggle-recording`, `models:download-progress`, `models:download-done`, `models:download-error`

> ⚠️ `electron/preload.ts` also exists but is **dead code** — `main.ts` loads `preload.cjs`. The `.ts` file diverges from `.cjs` and should eventually be deleted or made the canonical source.

---

## IPC Handlers (`electron/ipc/`)

### `electron/ipc/index.ts`
**Purpose:** Registers all IPC handler modules. Single import point called from `main.ts`.

**Registers:** audio, transcription, meetings, analysis, settings, notes, calendar, tags, system-info, models, export handlers.

---

### `electron/ipc/audio.ts`
**Purpose:** Audio capture IPC — bridges the renderer's record button to the backend audio pipeline.

**Channels:**
- `audio:list-devices` → returns `[{id, name, kind, isDefault}]` from `AudioCaptureService`
- `audio:start-capture(deviceId, meetingId, language)` → sets meetingId+language on StreamProcessor, starts capture
- `audio:stop-capture` → stops capture, calls `streamProcessor.stop()`

**Key side-effect:** Listens for `audio-chunk-ready` events from `AudioCaptureService` → forwards each chunk to `streamProcessor.processAudioChunk()`

---

### `electron/ipc/transcription.ts`
**Purpose:** Transcript data IPC.

**Channels:**
- `transcript:translate(text, targetLang)` → `TranslationService.translate()`
- `transcript:get-by-meeting(meetingId)` → `TranscriptRepository.getByMeetingId()`
- `transcript:update-text(id, text)` → `TranscriptRepository.updateText()`
- `transcript:search(query)` → `TranscriptRepository.search()` (FTS5 or LIKE fallback)

---

### `electron/ipc/meetings.ts`
**Purpose:** Meeting CRUD.

**Channels:** `meeting:create`, `meeting:get-all`, `meeting:get-by-id`, `meeting:update`, `meeting:delete`, `meeting:search`

**Note:** `meeting:search` does a SQL JOIN on `transcript_segments` — searches both titles AND transcript content.

---

### `electron/ipc/analysis.ts`
**Purpose:** AI meeting analysis.

**Channels:**
- `analysis:analyze(meetingId)` → calls `AIAnalysisService.analyzeMeeting()` → saves to DB → returns result
- `analysis:get-results(meetingId)` → reads saved analysis from DB

---

### `electron/ipc/export.ts`
**Purpose:** Meeting export in 5 formats.

**Channels:**
- `export:json(meetingId)` → saves `{meeting, segments}` JSON with save dialog
- `export:text(meetingId)` → saves `[MM:SS] text` format
- `export:pdf(meetingId)` → renders HTML in hidden BrowserWindow → printToPDF (try/finally ensures window is destroyed)
- `export:srt(meetingId)` → saves SubRip subtitle format
- `export:md(meetingId)` → saves Markdown with headers and timestamp-prefixed lines

All use `dialog.showSaveDialog()`. All `writeFileSync` calls are wrapped in try/catch.

---

### `electron/ipc/notes.ts`
**Channels:** `note:create`, `note:get-by-meeting`, `note:get-by-segment`, `note:update`, `note:toggle-pin`, `note:delete`

### `electron/ipc/calendar.ts`
**Channels:** `calendar:create`, `calendar:get-all`, `calendar:get-by-date-range`, `calendar:get-by-meeting`, `calendar:update`, `calendar:delete`

> ⚠️ `get-by-date-range` receives ISO strings (not Date objects) from IPC — handler wraps with `new Date()`.

### `electron/ipc/tags.ts`
**Channels:** `tag:create`, `tag:get-all`, `tag:get-by-meeting`, `tag:add-to-meeting`, `tag:remove-from-meeting`, `tag:delete`

> ⚠️ Tags API is fully implemented in backend but has no frontend UI yet.

### `electron/ipc/settings.ts`
**Channels:** `settings:get(key)`, `settings:set(key, value)`, `settings:get-all` (omits API keys from bulk response for security)  
**Backend:** `electron-store` persisted to disk. Defaults: `{defaultLanguage: 'auto', autoDetectLanguage: true, theme: 'system', whisperMode: 'local', whisperModelSize: 'small'}`

### `electron/ipc/models.ts`
**Purpose:** Whisper model download management + Ollama detection.

**Channels:**
- `models:get-whisper-downloaded` → scans `~/.cache/whisper/` for `.pt` files
- `models:check-ollama` → curls `localhost:11434/api/tags` for model list
- `models:download-whisper(modelName)` → downloads from official OpenAI CDN with progress events
- `models:cancel-download(modelName)` → aborts in-flight download

**Push events sent:** `models:download-progress {model, percent, mbDone, mbTotal}`, `models:download-done {model}`, `models:download-error {model, error}`

### `electron/ipc/system-info.ts`
**Channel:** `get-system-info` → returns `{platform, arch, cpuCores, cpuModel, totalRAM, hasGPU, gpuInfo, recommendedModel, canRunLarge, canRunMedium, estimatedSpeed}`  
**Used by:** SettingsPanel for model recommendations.

---

## Services (`electron/services/`)

### `electron/services/stream-processor.ts` ← Core pipeline
**Purpose:** Manages the transcription queue. Receives audio chunks, routes to Whisper, saves results, pushes to renderer.

**Key methods:**
- `setMeetingId(meetingId, language)` — sets context for all queued chunks; also sets sessionStartTime on WhisperLocalService
- `processAudioChunk(chunk)` — adds to queue; drains serially (one at a time, no concurrent Whisper calls)
- `stop()` — clears meetingId but lets queue drain (in-flight chunks complete with their captured meetingId)
- `shutdown()` — stops queue, kills Python server process

**Flow:** chunk → queue → `processOne()` → reads `whisperMode`/`whisperModelSize` from store → calls `WhisperLocalService` or `WhisperTranscriptionService` → saves segment → `webContents.send('transcript:segment', segment)`

**Push channels:** `transcript:segment`, `transcript:error`

**Singleton:** exported as `streamProcessor` — same instance used by `audio.ts` IPC and `main.ts` shutdown.

---

### `electron/services/ai/whisper-local.ts`
**Purpose:** TypeScript wrapper around the persistent `whisper_server.py` process.

**Key behaviour:**
- Spawns `whisper_server.py` on first use, keeps it alive between requests
- Uses a request/response model over stdin/stdout pipes
- `pendingResolve`/`pendingReject` are single-slot — the serial queue in `stream-processor.ts` prevents concurrent calls
- **Timeout handle** is stored in `this.timeoutHandle` and **cleared on each resolve** to prevent stale timeouts corrupting future requests
- Converts `ArrayBuffer` PCM data → WAV file → sends path to Python → parses JSON result
- `setSessionStart(time)` stores the session start time so segment timestamps are relative (e.g., `0:15`, `1:32`) not Unix timestamps

**Python detection path:** `venv/bin/python3` → `/opt/homebrew/bin/python3`

### `electron/services/ai/whisper-client.ts`
**Purpose:** OpenAI Whisper API mode. Used when `whisperMode === 'api'`.  
**Note:** Creates temp WAV file, sends to OpenAI `whisper-1` model, cleans up. Temp file cleanup is in `finally` block.

### `electron/services/ai/analysis.ts`
**Purpose:** Multi-provider AI meeting analysis.  
**Reads from store:** `analysisProvider` → routes to `analyzeWithOllama`, `analyzeWithAnthropic`, or `analyzeWithOpenAI`  
**Returns:** `{summary, keyPoints, actionItems, topics}`  
**All three providers** read their API keys/URLs directly from `electron-store` on each call.

### `electron/services/ai/translation.ts`
**Purpose:** Multi-provider translation.  
**Same provider selection as analysis** — uses `analysisProvider` from store.  
**Providers:** Ollama (local), Anthropic claude-haiku, OpenAI gpt-4o-mini  
**Called from:** `transcript:translate` IPC when user clicks Translation in MeetingDetail

---

### `electron/services/audio-capture/index.ts` ← VAD Engine
**Purpose:** Voice Activity Detection + audio routing. The heart of real-time transcription.

**VAD constants:**
```
SILENCE_RMS_THRESHOLD = 0.01    // below this = silence
SILENCE_BEFORE_SEND_MS = 400   // 400ms of silence triggers a chunk
MIN_SPEECH_MS = 200            // ignore clips shorter than 200ms
MAX_CHUNK_MS = 8000            // hard cap: always send after 8s
```

**How VAD works:**
1. Every raw PCM buffer → calculate RMS
2. If RMS > threshold → speech detected; buffer accumulates
3. After 400ms of silence → `flushSpeechChunk()` → emits `audio-chunk-ready`
4. On `stopCapture()` → remaining buffer flushed immediately (even if no trailing silence)

**Device routing:**
- `deviceId === 'microphone'` → `MicrophoneCapture` (SoX/node-record-lpcm16)
- `deviceId === 'system-audio'` → `SystemAudioMacOS` (ScreenCaptureKit native module)

### `electron/services/audio-capture/microphone.ts`
**Purpose:** Microphone capture using `node-record-lpcm16` + SoX.  
**Key:** Prepends `/opt/homebrew/bin` and `/usr/local/bin` to `process.env.PATH` so SoX is found inside Electron (which doesn't inherit shell PATH).

### `electron/services/audio-capture/system-audio-macos.ts`
**Purpose:** System audio capture wrapper around the native ScreenCaptureKit addon.  
**Float32 conversion:** SCK delivers float32 PCM → converted to int16 PCM (`float32ToInt16()`) before emitting to the pipeline. This ensures the WAV file is in the correct format for Whisper.  
**Volume:** Calculated directly from float32 samples for accuracy.  
**Permission errors:** Propagated as error strings (not crashes) — renderer handles gracefully.

### `electron/services/audio-capture/permission-check.ts`
**Purpose:** Screen Recording permission helpers (`checkScreenRecordingPermission`, `requestScreenRecordingPermission`).  
⚠️ **Currently dead code** — not imported anywhere. Should be wired into `system-audio-macos.ts` start flow.

---

### `electron/services/database/schema.ts`
**Purpose:** SQLite database initialization. Opens DB, sets WAL mode, enables foreign keys, creates tables and indexes.

**Tables:**
| Table | Purpose |
|---|---|
| `meetings` | Meeting records with metadata (title, language, timezone, location, participants, isStarred, etc.) |
| `transcript_segments` | Individual transcript chunks (text, timestamp, language, confidence, speakerId, translation) |
| `analysis_results` | AI analysis JSON blobs (summary, keyPoints, actionItems, topics) |
| `notes` | User notes attached to meetings (5 types, pinnable) |
| `calendar_events` | Calendar events optionally linked to meetings |
| `tags` | Tag definitions |
| `meeting_tags` | Many-to-many meeting↔tag join table |
| `transcripts_fts` | **FTS5 virtual table** for full-text search across transcript text |

**FTS5 triggers:** Auto-sync `transcripts_fts` on insert/update/delete of `transcript_segments`.

---

### `electron/services/database/repositories/`

| File | Key Methods |
|---|---|
| `meetings.ts` | `create`, `getAll`, `getById`, `update` (handles isStarred, isArchived, location, participants, durationSeconds, endTime), `delete`, `search` (SQL JOIN on transcripts with LIKE escape) |
| `transcripts.ts` | `create`, `getByMeetingId`, `updateTranslation`, `updateText`, `search` (FTS5 with LIKE fallback) |
| `analysis.ts` | `save` (INSERT OR REPLACE), `getByMeetingId` |
| `notes.ts` | `create`, `getByMeetingId`, `getBySegmentId`, `update`, `togglePin`, `delete` |
| `calendar.ts` | `create`, `getAll`, `getByDateRange`, `getByMeetingId`, `update`, `delete` |
| `tags.ts` | `create`, `getAll`, `getByMeetingId`, `addToMeeting`, `removeFromMeeting`, `delete` |

---

### `electron/services/env-check.ts`
**Purpose:** Async environment health check (runs at startup, does NOT block the event loop).  
**Checks:** SoX present at known paths | venv Python exists | `import whisper` succeeds  
**Used by:** `main.ts` (registers `env:check` IPC) → Dashboard shows status badges

### `electron/services/system-info.ts`
**Purpose:** Hardware detection for Whisper model recommendations.  
**Returns:** CPU cores, total RAM, platform, GPU presence (via shell commands), `recommendedModel` (based on RAM/cores), speed estimates per model.  
**Cached:** Result stored after first call.

---

## Native Module (`native/macos/`)

### `native/macos/screen_capture_kit.mm`
**Purpose:** Objective-C++ N-API addon that captures all system audio via ScreenCaptureKit.

**Exported functions:**
- `startCapture(callback)` — async; calls back with `null` on success or error string on failure; subsequent calls deliver audio `Buffer` chunks
- `stopCapture()` — stops stream, releases resources
- `checkAvailability()` → `true` if macOS 13+

**Key design:**
- All SCK work runs on a dedicated `dispatch_queue` — never blocks the Node.js main thread (fixed SIGSEGV crash from previous blocking semaphore approach)
- `ThreadSafeFunction` (TSFN) has a `atomic<bool> tsfinReleased` guard to prevent double-release crashes
- Audio callback captures TSFN via `Acquire()` before the ObjC block — prevents use-after-free when `Stop()` is called
- `didStopWithError:` delegate method propagates mid-recording failures to JS (prevents silent hang)
- Uses display-based `SCContentFilter` (not window-based) — captures all audio from all apps and browser tabs

### `native/macos/binding.gyp`
**Purpose:** node-gyp build config. Links ScreenCaptureKit, AVFoundation, CoreMedia, CoreAudio frameworks.

---

## React Frontend (`src/`)

### `src/main.tsx`
App entry point — mounts React into `#root`.

### `src/App.tsx` ← Navigation hub
**Purpose:** Root component. Manages view routing, loads initial data, applies theme.

**State:** `currentView` ('home' | 'capture' | 'meeting' | 'calendar' | 'settings')

**Key behaviours:**
- Loads all meetings from DB on startup (populates Zustand store)
- Loads persisted theme/language from backend into Zustand store on startup (so theme applies immediately)
- Listens for system theme changes (`matchMedia change` event) when `theme === 'system'`
- Calendar → Meeting navigation: uses `prevViewRef` — only redirects if `currentView` WAS 'calendar' when meeting was selected
- Global shortcut: listens for `shortcut:toggle-recording` → navigates to capture view (CaptureView handles the actual toggle)
- Meetings sidebar click: clears `currentMeeting` so list is shown (not last detail view)

---

### `src/components/CaptureView.tsx` ← Recording screen
**Purpose:** The main recording interface.

**Key state:** `isCapturing`, `language`, `meetingTitle`, `isProcessing`, `elapsedSeconds`, `justStoppedMeetingId`

**Key refs:**
- `isCapturingRef` — keeps shortcut closure current for `isCapturing`
- `currentMeetingIdRef` — prevents stale closure: `handleStopCapture` uses this, not the captured `currentMeetingId`
- `elapsedSecondsRef` — same: used in stop handler for accurate `durationSeconds`
- `processingTimerRef` — 30s processing timeout, cancelled on unmount to prevent state updates after unmount

**IPC listeners** (stable refs via `useRef` to prevent duplicate listeners across StrictMode remounts):
- `audio:volume` → volume visualizer
- `transcript:segment` → adds segment to store, clears isProcessing spinner
- `transcript:error` → shows error banner
- `shortcut:toggle-recording` → toggles recording using refs

**Flow:**
1. `handleStartCapture` → creates meeting → starts audio capture with language
2. VAD detects speech → chunks arrive → Whisper processes → `transcript:segment` fires
3. `handleStopCapture` → stops audio → saves endTime+durationSeconds (using refs, not stale closure values)
4. After stop: "View Recording" button appears → navigates to MeetingDetail

---

### `src/components/MeetingDetail.tsx` ← Meeting review
**Purpose:** Full meeting review — transcript, notes, AI analysis, export.

**Key state:** `segments`, `showTranslation`, `isTranslating`, `analyzeError`, `exportError`, `deleteError`, `exportOpen`

**Star state:** Derived directly from `meeting.isStarred` prop (not local state) — avoids stale value when store updates.

**Key handlers:**
- `handleToggleTranslation` — translates all untranslated segments using configured AI provider; errors revert the toggle
- `handleAnalyze` — AI analysis via configured provider (Ollama/Claude/GPT-4)
- `handleExport` — routes to 5 export formats via IPC
- `handleCopy` — copies transcript as plain text or Markdown with clipboard API + execCommand fallback
- `handleEditSegment` — inline edit via `transcript:update-text` IPC
- `handleDelete` — deletes meeting with confirmation modal and error handling

**Sub-component:** `SegmentRow` — inline-editable transcript segment with timestamp, hover edit button, Cmd+Enter to save.

---

### `src/components/MeetingList.tsx`
**Purpose:** Searchable list of all meetings.

**Search:** Debounced 300ms → calls `meeting:search` IPC (SQL searches title + transcript content). Empty query: instant (no debounce).

**Initial load:** Only fetches from backend if store is empty (avoids duplicate load with App.tsx).

**Delete:** Custom in-app confirmation modal (not `confirm()`), with error handling.

---

### `src/components/Dashboard.tsx`
**Purpose:** Home screen — launch pad and quick overview.

**Shows:** Start Recording button, system status (sox/python/whisper), month stats, 5 recent meetings.

**Env check:** Fails safe on error (`false, false, false`) rather than false-success.

**Hardware-aware Ollama suggestions:** `getSuggestedOllamaModels(ramGB)` filters popular models by available RAM.

---

### `src/components/SettingsPanel.tsx`
**Purpose:** Full settings with Whisper model management and AI provider configuration.

**Sections (collapsible):**
1. System info card (CPU, RAM, recommended model)
2. Transcription — mode toggle (Local FREE / API) + model picker with download manager
3. AI Providers — None / Claude / GPT-4 / Ollama (hardware-aware model suggestions)
4. API Keys
5. Language
6. Appearance

**Ollama detection:** Auto-checks when switching to Ollama provider. Shows each installed model as a card with RAM fit indicator and ⭐ "Best for you" badge.

**Model download:** Live progress bar per model, cancel button, shows "… MB" when content-length unknown.

---

### `src/components/EnhancedCalendarView.tsx`
**Purpose:** Monthly calendar with meeting stats.

**Two separate effects:** `loadEvents` depends on `[currentDate]` only; `loadMeetingsForMonth` depends on `[currentDate, meetings]` — prevents redundant API calls during recording.

**Today button:** Navigates to current month AND opens today's day panel (`setSelectedDay(today)`).

**Day sidebar:** Shows meeting cards with duration, transcript count, source icon, star badge.

---

### `src/components/NotesPanel.tsx`
**Purpose:** Notes attached to a meeting. 5 types: general, question, action, decision, idea.

**Features:** Pin/unpin, inline edit (with Cmd+Enter to save for both new and existing notes), optimistic delete with rollback, error handling.

---

### `src/components/TranscriptDisplay.tsx`
**Purpose:** Live transcript during recording. Auto-scrolls only when user was already at the bottom (doesn't hijack manual scroll).

### `src/components/AudioVisualizer.tsx`
**Purpose:** 20-bar volume visualizer. Bars are level-driven (not static index-based). Animated idle state via `setInterval` while active.

---

## Zustand Stores (`src/stores/`)

### `meetingStore.ts`
```ts
{ meetings[], currentMeeting, currentAnalysis }
// updateMeeting() syncs BOTH the list AND currentMeeting if id matches
```

### `transcriptStore.ts`
```ts
{ segments[], showTranslation, targetLanguage }
// addSegment() deduplicates by id — prevents double-render from StrictMode
```

### `audioStore.ts`
```ts
{ isCapturing, devices[], selectedDeviceId, volumeLevel }
```

### `settingsStore.ts`
```ts
{ openaiApiKey, anthropicApiKey, defaultLanguage, autoDetectLanguage, theme }
// Loaded from backend on App startup (not just on SettingsPanel mount)
```

---

## Type System

### `src/types.ts` — Frontend types
```ts
Meeting        // id, title, startTime, endTime, sourceApp, language, timezone,
               // location, participants, notes, isStarred, isArchived,
               // durationSeconds, transcriptCount, recordingDevice
TranscriptSegment  // id, meetingId, timestamp, text, language, translation,
                   // confidence, speakerId
AnalysisResult // summary, keyPoints, actionItems[], topics[]
AudioDevice    // id, name, kind, isDefault
Language       // 'auto' | 'en' | 'el' | 'cs'
```

### `electron/types/index.ts` — Backend types (more complete than frontend)
Includes `AppSettings`, `Note`, `CalendarEvent`, `Tag` etc.

### `src/vite-env.d.ts` — Window API types
Declares `window.api` and `window.electron` so TypeScript knows the IPC surface shape.

---

## Data Flow Summary

```
User speaks
    ↓
MicrophoneCapture / SystemAudioMacOS
    ↓ (raw PCM Buffer)
AudioCaptureService.handleAudioData()  ← VAD here
    ↓ (speech detected, silence gap hit)
AudioCaptureService.flushSpeechChunk()
    ↓ (emits 'audio-chunk-ready')
audio.ts IPC listener
    ↓
StreamProcessor.processAudioChunk()   ← adds to serial queue
    ↓
WhisperLocalService.transcribe()
    ↓ (writes WAV file)
whisper_server.py via stdin pipe
    ↓ (JSON result via stdout)
TranscriptRepository.create()         ← saved to SQLite
    ↓
webContents.send('transcript:segment')
    ↓
CaptureView ipcRenderer.on listener
    ↓
transcriptStore.addSegment()          ← deduplicated by id
    ↓
TranscriptDisplay renders new segment
```

---

## IPC Channel Reference

### Invokable (renderer → main, returns value)
| Channel | Handler File | Description |
|---|---|---|
| `audio:list-devices` | `ipc/audio.ts` | Get available audio sources |
| `audio:start-capture` | `ipc/audio.ts` | Start recording |
| `audio:stop-capture` | `ipc/audio.ts` | Stop recording |
| `transcript:translate` | `ipc/transcription.ts` | Translate text via AI |
| `transcript:get-by-meeting` | `ipc/transcription.ts` | Load saved segments |
| `transcript:update-text` | `ipc/transcription.ts` | Edit transcript segment |
| `transcript:search` | `ipc/transcription.ts` | Full-text search |
| `meeting:*` | `ipc/meetings.ts` | Meeting CRUD + search |
| `analysis:analyze` | `ipc/analysis.ts` | Run AI analysis |
| `analysis:get-results` | `ipc/analysis.ts` | Load saved analysis |
| `settings:get/set/get-all` | `ipc/settings.ts` | Persistent settings |
| `export:json/text/pdf/srt/md` | `ipc/export.ts` | Export meeting |
| `note:*` | `ipc/notes.ts` | Notes CRUD |
| `calendar:*` | `ipc/calendar.ts` | Calendar CRUD |
| `tag:*` | `ipc/tags.ts` | Tags CRUD |
| `get-system-info` | `ipc/system-info.ts` | Hardware info |
| `env:check` | `main.ts` | SoX/Python/Whisper health |
| `models:get-whisper-downloaded` | `ipc/models.ts` | List downloaded models |
| `models:check-ollama` | `ipc/models.ts` | Detect Ollama + models |
| `models:download-whisper` | `ipc/models.ts` | Download a Whisper model |
| `models:cancel-download` | `ipc/models.ts` | Cancel in-progress download |

### Push events (main → renderer, no return)
| Channel | Sent from | Description |
|---|---|---|
| `audio:volume` | `AudioCaptureService` | Live volume level (0-1) |
| `transcript:segment` | `StreamProcessor` | New transcribed segment |
| `transcript:error` | `StreamProcessor` | Transcription failure |
| `shortcut:toggle-recording` | `main.ts` | Global shortcut fired |
| `models:download-progress` | `ipc/models.ts` | Download progress update |
| `models:download-done` | `ipc/models.ts` | Download complete |
| `models:download-error` | `ipc/models.ts` | Download failed |

---

## Known Gaps / Future Work

| Area | Status | Notes |
|---|---|---|
| Windows system audio | ❌ Not implemented | Needs WASAPI loopback capture |
| Linux system audio | ❌ Not implemented | Needs PulseAudio/PipeWire |
| Speaker diarization | ❌ Not implemented | WhisperX + pyannote.audio planned |
| Audio playback | ❌ Not implemented | Record + store audio file, sync with transcript |
| Tags UI | ❌ Backend ready | Tags IPC + DB complete, no frontend UI |
| Week/Day calendar views | ❌ State exists, not rendered | Buttons visible but only month renders |
| Floating mini recorder | ❌ Not implemented | Always-on-top overlay during recording |
| permission-check.ts | ⚠️ Dead code | Screen Recording permission helpers never called |
| preload.ts | ⚠️ Dead code | Diverges from preload.cjs, should be deleted |
| `tags` column on meetings | ⚠️ Redundant | Parallel to meeting_tags join table, always NULL |
