# WhisNotes - Technical Architecture

**Version:** 0.1.0  
**Last Updated:** 2026-09-20

---

## 🏗️ System Overview

WhisNotes is an Electron-based desktop application that provides real-time meeting transcription and AI-powered analysis. The architecture follows a clean separation between the main process (Node.js/Electron backend) and renderer process (React frontend), communicating via IPC.

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface (React)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Capture  │  │ Meeting  │  │ Meeting  │  │ Settings │       │
│  │   View   │  │   List   │  │  Detail  │  │  Panel   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│         │              │              │              │          │
│         └──────────────┴──────────────┴──────────────┘          │
│                         │                                        │
│                    Zustand Stores                               │
│         ┌───────────────┼───────────────┐                      │
│         │               │               │                       │
│    audioStore    transcriptStore   meetingStore                │
└─────────┼───────────────┼───────────────┼──────────────────────┘
          │               │               │
          │         IPC Bridge (contextBridge)                    
          │               │               │
┌─────────┼───────────────┼───────────────┼──────────────────────┐
│         │               │               │                       │
│    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐                  │
│    │  Audio  │    │Transcr. │    │ Meeting │                  │
│    │   IPC   │    │   IPC   │    │   IPC   │                  │
│    └────┬────┘    └────┬────┘    └────┬────┘                  │
│         │              │              │                         │
│    ┌────▼──────────────▼──────────────▼─────┐                 │
│    │         Service Layer                   │                 │
│    │  ┌──────────┐  ┌──────────┐  ┌────────┐│                 │
│    │  │  Audio   │  │    AI    │  │Database││                 │
│    │  │ Capture  │  │ Services │  │ Layer  ││                 │
│    │  └──────────┘  └──────────┘  └────────┘│                 │
│    └─────────────────────────────────────────┘                 │
│                   Electron Main Process                         │
└─────────────────────────────────────────────────────────────────┘
          │               │               │
     ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
     │  OS     │    │ OpenAI  │    │ Claude  │
     │  Audio  │    │Whisper  │    │   API   │
     │  APIs   │    │   API   │    │         │
     └─────────┘    └─────────┘    └─────────┘
```

---

## 📦 Project Structure

```
whisnotes/
├── electron/                      # Electron main process
│   ├── main.ts                   # App entry point, window creation
│   ├── preload.ts                # IPC bridge, context isolation
│   ├── types/
│   │   └── index.ts              # Shared TypeScript types
│   ├── ipc/                      # IPC handlers
│   │   ├── index.ts              # Register all handlers
│   │   ├── audio.ts              # Audio capture IPC
│   │   ├── transcription.ts      # Transcription IPC
│   │   ├── meetings.ts           # Meeting CRUD IPC
│   │   ├── analysis.ts           # AI analysis IPC
│   │   └── settings.ts           # Settings IPC
│   └── services/
│       ├── audio-capture/
│       │   └── index.ts          # Platform-agnostic audio service
│       ├── ai/
│       │   ├── whisper-client.ts # OpenAI Whisper integration
│       │   ├── translation.ts    # Translation service
│       │   └── analysis.ts       # Claude AI analysis
│       └── database/
│           ├── schema.ts         # SQLite schema & init
│           └── repositories/
│               ├── meetings.ts   # Meeting data access
│               ├── transcripts.ts# Transcript data access
│               └── analysis.ts   # Analysis data access
│
├── src/                          # React renderer process
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Main app component
│   ├── index.css                 # Global styles + Tailwind
│   ├── types.ts                  # Frontend types
│   ├── stores/                   # Zustand state management
│   │   ├── audioStore.ts         # Audio capture state
│   │   ├── transcriptStore.ts    # Transcript segments state
│   │   ├── meetingStore.ts       # Meeting list state
│   │   └── settingsStore.ts      # App settings state
│   └── components/
│       ├── CaptureView.tsx       # Recording interface
│       ├── AudioVisualizer.tsx   # Volume level visualization
│       ├── TranscriptDisplay.tsx # Real-time transcript view
│       ├── MeetingList.tsx       # All meetings list
│       ├── MeetingDetail.tsx     # Individual meeting view
│       └── SettingsPanel.tsx     # Settings configuration
│
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite bundler config
├── tailwind.config.js            # Tailwind CSS config
├── electron-builder.json         # Build & packaging config
├── README.md                     # User documentation
├── ARCHITECTURE.md               # This file
├── STATUS.md                     # Current implementation status
└── QUICKSTART.md                 # Getting started guide
```

---

## 🔄 Data Flow Architecture

### 1. Audio Capture Flow

```
User clicks "Start Recording"
         │
         ▼
CaptureView (React)
         │
         ▼
audioStore.setCapturing(true)
         │
         ▼
IPC: audio:start-capture
         │
         ▼
AudioCaptureService (Main Process)
         │
         ├─► [macOS] ScreenCaptureKit API
         ├─► [Windows] WASAPI Loopback
         └─► [Linux] PulseAudio
         │
         ▼
Audio chunks (30s segments)
         │
         ▼
IPC: audio:data → Renderer
         │
         ▼
StreamProcessor buffers & sends to Whisper
         │
         ▼
WhisperTranscriptionService
         │
         ▼
OpenAI Whisper API
         │
         ▼
TranscriptSegment returned
         │
         ▼
IPC: transcript:segment → Renderer
         │
         ▼
transcriptStore.addSegment()
         │
         ▼
TranscriptDisplay auto-updates
```

### 2. Translation Flow

```
User toggles "Show Translation"
         │
         ▼
TranscriptDisplay component
         │
         ▼
IPC: transcript:translate
         │
         ▼
TranslationService (Main Process)
         │
         ▼
OpenAI GPT-4 API
         │
         ▼
Translated text returned
         │
         ▼
transcriptStore.updateSegmentTranslation()
         │
         ▼
UI shows translated text
```

### 3. AI Analysis Flow

```
User clicks "Analyze" button
         │
         ▼
MeetingDetail component
         │
         ▼
IPC: analysis:analyze
         │
         ▼
AIAnalysisService (Main Process)
         │
         ├─► Load transcript segments from DB
         │
         ├─► Combine into full transcript
         │
         ├─► Send to Claude API
         │
         └─► Parse JSON response
         │
         ▼
AnalysisResult {
  summary,
  keyPoints,
  actionItems,
  topics
}
         │
         ▼
Save to analysis_results table
         │
         ▼
meetingStore.setCurrentAnalysis()
         │
         ▼
UI displays analysis
```

### 4. Database Flow

```
Meeting Created
         │
         ▼
MeetingRepository.create()
         │
         ▼
INSERT INTO meetings
         │
         ▼
Meeting ID returned
         │
         ▼
Transcript segments saved as they arrive
         │
         ▼
TranscriptRepository.create()
         │
         ▼
INSERT INTO transcript_segments
         │
         ▼
Analysis saved after generation
         │
         ▼
AnalysisRepository.save()
         │
         ▼
INSERT INTO analysis_results
```

---

## 🗄️ Database Schema

### SQLite Tables

```sql
-- meetings table
CREATE TABLE meetings (
  id TEXT PRIMARY KEY,              -- UUID
  title TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  source_app TEXT NOT NULL,         -- 'slack', 'zoom', 'manual', etc.
  language TEXT NOT NULL,           -- 'en', 'el', 'cs', 'auto'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- transcript_segments table
CREATE TABLE transcript_segments (
  id TEXT PRIMARY KEY,              -- UUID
  meeting_id TEXT NOT NULL,         -- FK to meetings
  timestamp REAL NOT NULL,          -- Seconds from meeting start
  text TEXT NOT NULL,               -- Transcribed text
  language TEXT NOT NULL,           -- Detected language
  translation TEXT,                 -- Optional translation
  confidence REAL NOT NULL,         -- 0.0 to 1.0
  speaker_id INTEGER,               -- Optional speaker identifier
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- analysis_results table
CREATE TABLE analysis_results (
  id TEXT PRIMARY KEY,              -- UUID
  meeting_id TEXT NOT NULL,         -- FK to meetings
  type TEXT NOT NULL,               -- 'full', 'summary', etc.
  content TEXT NOT NULL,            -- JSON stringified
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_segments_meeting ON transcript_segments(meeting_id);
CREATE INDEX idx_segments_timestamp ON transcript_segments(timestamp);
CREATE INDEX idx_analysis_meeting ON analysis_results(meeting_id);
CREATE INDEX idx_meetings_created ON meetings(created_at DESC);
```

**Location:** `~/Library/Application Support/WhisNotes/whisnotes.db` (macOS)

---

## 🔌 IPC Communication

### Security Model

- **Context Isolation:** Enabled (renderer can't access Node.js)
- **Node Integration:** Disabled
- **Preload Script:** Exposes safe API via contextBridge

### API Surface

```typescript
// Exposed to renderer via window.api
interface API {
  audio: {
    listDevices(): Promise<AudioDevice[]>
    startCapture(deviceId: string): Promise<void>
    stopCapture(): Promise<void>
    onAudioData(callback: (data: ArrayBuffer) => void)
    onVolumeLevel(callback: (level: number) => void)
  }
  
  transcription: {
    onSegment(callback: (segment: TranscriptSegment) => void)
    translate(text: string, targetLang: string): Promise<string>
  }
  
  meetings: {
    create(title: string, sourceApp: string, language: string): Promise<Meeting>
    getAll(): Promise<Meeting[]>
    getById(id: string): Promise<Meeting | null>
    update(id: string, data: Partial<Meeting>): Promise<boolean>
    delete(id: string): Promise<boolean>
    search(query: string): Promise<Meeting[]>
  }
  
  analysis: {
    analyze(meetingId: string): Promise<AnalysisResult>
    getResults(meetingId: string): Promise<AnalysisResult | null>
  }
  
  settings: {
    get(key: string): Promise<any>
    set(key: string, value: any): Promise<boolean>
    getAll(): Promise<AppSettings>
  }
  
  export: {
    toJSON(meetingId: string): Promise<void>
    toText(meetingId: string): Promise<void>
    toPDF(meetingId: string): Promise<void>
  }
}
```

---

## 🎨 Frontend Architecture

### State Management (Zustand)

**Why Zustand:**
- Minimal boilerplate
- No providers needed
- TypeScript-first
- Works well with React hooks

**Store Structure:**

```typescript
// audioStore - Audio capture state
{
  isCapturing: boolean
  devices: AudioDevice[]
  selectedDeviceId?: string
  volumeLevel: number
}

// transcriptStore - Real-time transcription
{
  segments: TranscriptSegment[]
  currentMeetingId?: string
  showTranslation: boolean
  targetLanguage: string
}

// meetingStore - Meeting management
{
  meetings: Meeting[]
  currentMeeting?: Meeting
  currentAnalysis?: AnalysisResult
}

// settingsStore - App configuration
{
  openaiApiKey?: string
  anthropicApiKey?: string
  defaultLanguage: string
  autoDetectLanguage: boolean
  theme: 'light' | 'dark' | 'system'
}
```

### Component Hierarchy

```
App.tsx
├── Sidebar Navigation
└── Main Content (Route-based)
    ├── Home View
    │   └── Welcome Screen
    ├── Capture View
    │   ├── Meeting Title Input
    │   ├── Device Selector
    │   ├── Language Selector
    │   ├── Start/Stop Button
    │   ├── AudioVisualizer
    │   └── TranscriptDisplay
    │       └── TranscriptSegment (repeated)
    ├── Meeting List View
    │   ├── Search Bar
    │   └── MeetingCard (repeated)
    └── Settings View
        ├── API Key Inputs
        ├── Language Settings
        └── Appearance Settings
```

### Styling Strategy

**Tailwind CSS Utility-First:**
- Dark theme by default (slate palette)
- Primary color: Blue (#0ea5e9)
- Responsive design
- Consistent spacing scale
- Custom scrollbars

**Key Design Tokens:**
```css
Background: slate-950 (#020617)
Cards: slate-900 (#0f172a)
Borders: slate-800 (#1e293b)
Text: white / slate-400
Primary: primary-600 (#0284c7)
Accent: primary-500 (#0ea5e9)
```

---

## 🤖 AI Service Integration

### 1. Whisper Transcription Service

**Provider:** OpenAI Whisper API  
**Model:** `whisper-1`  
**Input:** Audio file (WAV, 16kHz mono)  
**Output:** Transcription + language detection

**Configuration:**
```typescript
{
  model: 'whisper-1',
  language: 'auto' | 'en' | 'el' | 'cs',
  response_format: 'verbose_json',  // Includes metadata
}
```

**Chunking Strategy:**
- 30-second audio chunks
- 2-second overlap to prevent word cutoff
- Queue-based processing
- Rate limit: 50 requests/minute

**Cost:** $0.006 per minute of audio

### 2. Translation Service

**Provider:** OpenAI GPT-4  
**Model:** `gpt-4`  
**Strategy:** Direct translation with minimal prompt

**Prompt Template:**
```
Translate the following text from {source_language} to {target_language}.
Only provide the translation, no explanations:

{text}
```

**Optimization:**
- Batch translations for efficiency
- Cache translations in database
- Temperature: 0.3 (more deterministic)

**Cost:** ~$0.50 per 1000 words

### 3. Claude Analysis Service

**Provider:** Anthropic Claude  
**Model:** `claude-sonnet-4-5`  
**Max Tokens:** 2048

**Prompt Structure:**
```
Analyze the following meeting transcript and provide:

1. A concise summary (2-3 sentences)
2. Key points discussed (3-5 bullet points)
3. Action items with priority levels (if any)
4. Main topics covered

Transcript:
{full_transcript}

Provide your analysis in the following JSON format:
{schema}
```

**Output Parsing:**
- JSON extraction from markdown code blocks
- Schema validation
- Error handling for malformed responses

**Cost:** ~$0.30 per analysis (varies by meeting length)

---

## 🎵 Audio Architecture

### Platform-Specific Implementations

#### macOS
**Primary:** ScreenCaptureKit API (macOS 13+)
- Captures audio from specific applications
- Requires Screen Recording permission
- High-quality, low-latency

**Fallback:** BlackHole Virtual Audio Device
- User-installed virtual audio device
- Routes system audio to app
- More setup required

**Implementation:** Objective-C++ binding via N-API

#### Windows
**Method:** WASAPI Loopback Capture
- Windows Audio Session API
- Captures system audio or specific app
- Built into Windows

**Implementation:** C++ binding via N-API

#### Linux
**Method:** PulseAudio / PipeWire
- `parec` command for capture
- Dynamic sink/source detection
- PolicyKit for permissions

**Implementation:** Shell integration with Node.js

### Audio Format

**Target Format:**
- Sample Rate: 16kHz
- Channels: Mono
- Bit Depth: 16-bit PCM
- Container: WAV

**Why 16kHz?**
- Optimal for speech recognition
- Reduces file size
- Whisper API requirement
- Human voice range: 85-255 Hz (well covered)

### Processing Pipeline

```
OS Audio APIs (48kHz stereo)
         │
         ▼
Resampling (48kHz → 16kHz)
         │
         ▼
Mixing (Stereo → Mono)
         │
         ▼
Buffering (30-second chunks)
         │
         ▼
WAV Encoding
         │
         ▼
Send to Whisper API
```

---

## 🔒 Security & Privacy

### API Key Storage

**Method:** electron-store (encrypted)
- Keys stored in OS-specific secure storage
- Never logged or exposed in UI (password inputs)
- Not included in exports

**macOS:** `~/Library/Preferences/com.whisnotes.app.plist`  
**Windows:** Registry  
**Linux:** `~/.config/WhisNotes/config.json`

### Data Privacy

**Local-First Architecture:**
- All transcripts stored locally in SQLite
- No cloud sync (by design)
- User has full control

**External API Calls:**
1. OpenAI Whisper (audio data only)
2. OpenAI GPT-4 (text translation)
3. Anthropic Claude (text analysis)

**No Telemetry:** App doesn't phone home

### Permissions Required

**macOS:**
- Microphone access
- Screen Recording (for app audio capture)

**Windows:**
- Microphone access

**Linux:**
- PulseAudio access

---

## ⚙️ Build & Development

### Development Workflow

```bash
# Start dev server
npm run app:dev

# This runs concurrently:
# 1. vite (React dev server on port 5173)
# 2. tsx watch electron/main.ts (Electron in watch mode)
```

### Build Process

```bash
npm run build

# Steps:
# 1. tsc (TypeScript compilation)
# 2. vite build (Bundle React app)
# 3. electron-builder (Package for platform)
```

### Output Artifacts

**macOS:**
- `WhisNotes-0.1.0.dmg` (installer)
- `WhisNotes-0.1.0-mac.zip` (portable)

**Windows:**
- `WhisNotes Setup 0.1.0.exe` (installer)
- `WhisNotes 0.1.0.exe` (portable)

**Linux:**
- `WhisNotes-0.1.0.AppImage`
- `whisnotes_0.1.0_amd64.deb`
- `whisnotes-0.1.0.rpm`

---

## 📊 Performance Considerations

### Memory Management

**Electron Memory Usage:**
- Base: ~100-150 MB
- Per meeting: ~10-20 MB (transcripts)
- Audio buffers: ~5 MB (temporary)

**Optimization Strategies:**
- Lazy load meetings (virtual scrolling)
- Clear audio buffers after processing
- Limit transcript segment retention
- Database pagination

### Database Performance

**Indexes:**
- All foreign keys indexed
- Meeting created_at for sorting
- Segment timestamp for playback

**Queries:**
- Prepared statements (better-sqlite3)
- Transaction batching for bulk inserts
- Efficient JOIN queries

### Network Performance

**API Rate Limiting:**
- Whisper: Max 50 requests/minute
- GPT-4: Max 10,000 tokens/minute
- Claude: Max 4,000 tokens/minute

**Error Handling:**
- Exponential backoff for retries
- Queue management
- User feedback on failures

---

## 🧪 Testing Strategy (Planned)

### Unit Tests
- Service layer (audio, AI, database)
- Repository methods
- Utility functions

### Integration Tests
- IPC communication
- Database operations
- API client mocking

### E2E Tests (Playwright)
- Recording workflow
- Meeting list navigation
- Settings persistence

---

## 🚀 Deployment Architecture

### Auto-Update System (Planned)

**electron-updater:**
- Check for updates on startup
- Download in background
- Notify user when ready
- Install on restart

### Distribution Channels

**macOS:**
- Direct download from website
- Homebrew cask (future)

**Windows:**
- Direct download
- Chocolatey package (future)

**Linux:**
- Direct download
- Snap store (future)
- Flatpak (future)

---

## 📈 Scalability Considerations

### Large Meetings (3+ hours)

**Challenges:**
- Large transcript files
- API costs
- Memory usage

**Solutions:**
- Progressive transcription
- Chunked analysis
- Database pagination
- Export/archive old meetings

### Many Meetings (1000+)

**Challenges:**
- Database size
- Search performance
- UI lag

**Solutions:**
- Full-text search indexes
- Virtual scrolling
- Background indexing
- Archive functionality

---

## 🔄 Future Architecture Improvements

### Considered for v2.0

1. **Offline Mode:**
   - Local Whisper model (whisper.cpp)
   - Background sync queue
   - Offline-first UI

2. **Real-time Collaboration:**
   - WebSocket server
   - Shared transcripts
   - Live annotations

3. **Plugin System:**
   - Custom AI providers
   - Export formats
   - Integration hooks

4. **Cloud Sync (Optional):**
   - End-to-end encryption
   - Selective sync
   - Multi-device support

---

**Architecture Status:** Phase 1 complete. Core structure solid and ready for implementation.
