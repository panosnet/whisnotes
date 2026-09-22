# Changelog

All notable changes to WhisNotes will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- macOS audio capture implementation
- Windows audio capture implementation
- Linux audio capture implementation
- Real Whisper API integration
- Translation functionality
- Claude AI analysis integration
- Export features (PDF, DOCX, TXT)
- Full-text search
- Keyboard shortcuts

---

## [0.1.0-alpha] - 2026-09-20

### Added

#### Project Foundation
- Initial project setup with Electron + React + TypeScript
- Vite build system configuration
- Tailwind CSS styling framework
- Better-SQLite3 database integration
- ESM module support throughout

#### Electron Backend
- Main process with window management
- Preload script with secure IPC bridge
- Context isolation and security best practices
- IPC handler architecture for:
  - Audio capture
  - Transcription
  - Meeting management
  - AI analysis
  - Settings management

#### Database Layer
- SQLite schema with three tables:
  - `meetings` - Meeting metadata
  - `transcript_segments` - Transcription data
  - `analysis_results` - AI analysis results
- Repository pattern implementation:
  - MeetingRepository (CRUD + search)
  - TranscriptRepository (segments management)
  - AnalysisRepository (AI results storage)
- Database indexes for performance
- Automatic database initialization

#### AI Services (Structure)
- WhisperTranscriptionService class
  - Streaming transcription support
  - Multi-language detection
  - Confidence scoring
- TranslationService class
  - GPT-4 based translation
  - Batch translation support
  - Language name mapping
- AIAnalysisService class
  - Claude API integration structure
  - Summary generation
  - Key point extraction
  - Action item detection
  - Topic clustering

#### Audio Capture (Architecture)
- AudioCaptureService base class
- Platform detection logic
- Device enumeration interface
- Volume level monitoring
- Event emitter pattern for audio data
- Mock audio data generator for UI testing

#### React Frontend
- Main App component with sidebar navigation
- Four main views:
  - Home view with welcome screen
  - Capture view for recording
  - Meeting list view
  - Settings panel
- Zustand state management stores:
  - `audioStore` - Capture state
  - `transcriptStore` - Real-time transcript
  - `meetingStore` - Meeting data
  - `settingsStore` - App configuration

#### UI Components
- **CaptureView**
  - Meeting title input
  - Audio device selector
  - Language selector (auto, English, Greek, Czech)
  - Start/Stop recording controls
  - Real-time segment counter
  - Live audio visualizer
- **AudioVisualizer**
  - Animated volume level bars
  - 20-bar visualization
  - Color-coded active state
- **TranscriptDisplay**
  - Auto-scrolling transcript view
  - Timestamp formatting
  - Translation toggle
  - Confidence indicators
  - Language badges per segment
- **MeetingList**
  - Searchable meeting list
  - Date/time formatting
  - Language and source app badges
  - Delete functionality
  - Empty state messaging
- **MeetingDetail**
  - Meeting metadata display
  - AI analysis results:
    - Summary section
    - Key points list
    - Action items with priority badges
    - Topics tags
  - Full transcript view
  - Translation toggle
  - Export options dropdown (JSON/TXT/PDF)
  - Analyze button
- **SettingsPanel**
  - API key management (OpenAI, Anthropic)
  - Show/hide password toggles
  - Default language selector
  - Auto-detect language toggle
  - Theme selector (Light/Dark/System)
  - Help links to API key pages
  - Privacy note

#### Styling & Design
- Dark theme by default (Slate color palette)
- Primary blue accent color (#0ea5e9)
- Gradient branding
- Consistent spacing and typography
- Custom scrollbar styling
- Responsive layouts
- Smooth transitions and hover states
- Icon integration (lucide-react)
- Professional, modern UI design

#### Type System
- Comprehensive TypeScript types
- Shared types between Electron & React
- Type-safe IPC API
- Database model types
- AI service types
- Strong typing throughout

#### Configuration Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite bundler config
- `tailwind.config.js` - Tailwind customization
- `electron-builder.json` - Build & packaging config
- `.gitignore` - Git ignore rules

#### Documentation
- `README.md` - Comprehensive user documentation
- `ARCHITECTURE.md` - Technical architecture details
- `STATUS.md` - Current implementation status
- `TODO.md` - Roadmap and task tracking
- `CHANGELOG.md` - This file
- `QUICKSTART.md` - Getting started guide

### Technical Details

#### Dependencies Added
**Production:**
- `react` ^18.2.0 - UI framework
- `react-dom` ^18.2.0 - React DOM renderer
- `zustand` ^4.5.0 - State management
- `better-sqlite3` ^11.7.0 - SQLite database
- `@anthropic-ai/sdk` ^0.17.0 - Claude API
- `openai` ^4.28.0 - OpenAI API (Whisper, GPT-4)
- `date-fns` ^3.3.1 - Date formatting
- `electron-store` ^8.1.0 - Settings persistence
- `lucide-react` ^0.344.0 - Icon library

**Development:**
- `electron` ^28.2.2 - Desktop framework
- `typescript` ^5.3.3 - Type system
- `vite` ^5.1.1 - Build tool
- `@vitejs/plugin-react` ^4.2.1 - React support
- `tailwindcss` ^3.4.1 - CSS framework
- `concurrently` ^8.2.2 - Run scripts in parallel
- `tsx` ^4.7.1 - TypeScript executor
- `electron-builder` ^24.9.1 - App packaging

#### Build System
- Development mode with hot reload
- Vite for fast React builds
- TSX watch mode for Electron
- Concurrent dev servers
- Production build pipeline ready

### Known Limitations
- Audio capture not yet implemented (mock data only)
- AI services return placeholder data
- Export features not functional
- Only tested on macOS with Node 22
- No keyboard shortcuts yet
- No tests written yet

### Infrastructure
- Node.js 22 (LTS) required
- Better-SQLite3 compiled successfully on Apple Silicon
- ESM modules throughout
- Proper module resolution

---

## Release Notes

### v0.1.0-alpha

This is the initial alpha release of WhisNotes. The application structure is complete with a fully functional UI, but core features (audio capture, real AI integration) are not yet implemented.

**What Works:**
✅ Beautiful, responsive UI  
✅ Database storage and retrieval  
✅ Meeting management (create, list, delete, search)  
✅ Settings persistence  
✅ App navigation and routing  

**What Doesn't Work:**
❌ Actual audio recording  
❌ Real transcription (Whisper API)  
❌ Translation  
❌ AI analysis (Claude API)  
❌ Export to PDF/DOCX  

**Next Release (v0.2.0-alpha):**
- macOS audio capture
- Real Whisper transcription
- End-to-end recording workflow

---

## Versioning Strategy

**Format:** MAJOR.MINOR.PATCH[-PRERELEASE]

- **MAJOR:** Breaking changes, major features
- **MINOR:** New features, backwards compatible
- **PATCH:** Bug fixes, minor improvements
- **PRERELEASE:** alpha, beta, rc

**Current Phase:** Alpha (v0.x.x-alpha)  
**Target Stable:** v1.0.0 (all platforms, full features, tested)

---

[Unreleased]: https://github.com/yourusername/whisnotes/compare/v0.1.0-alpha...HEAD
[0.1.0-alpha]: https://github.com/yourusername/whisnotes/releases/tag/v0.1.0-alpha

---

## [0.1.1-alpha] - 2026-09-20 (Evening Update)

### Added

#### Notes System
- New `notes` table with full CRUD operations
- 5 note types: General, Question, Action, Decision, Idea
- Pin/unpin functionality for important notes
- Attach notes to meetings or specific transcript segments
- Color-coded notes by type
- NotesPanel React component
- Notes IPC handlers and repository
- Timestamps for creation and updates

#### Calendar Integration  
- New `calendar_events` table
- CalendarView React component with month grid
- Navigate between months
- Display events with times and locations
- Click events to view meetings
- Today highlighting
- Timezone support
- Attendee tracking
- Recurrence rules structure
- External calendar integration ready (Google, Outlook)

#### Tags System
- New `tags` and `meeting_tags` tables
- Create custom tags with colors
- Many-to-many tag-meeting relationships
- Auto-create tags when first used
- Tag IPC handlers and repository

#### Enhanced Meeting Metadata
- **timezone** - Auto-detected local timezone
- **location** - Physical or virtual location
- **participants** - Array of attendee names
- **durationSeconds** - Exact meeting duration
- **recordingDevice** - Which device captured audio
- **audioQuality** - Quality rating
- **notes** - General meeting notes field
- **tags** - Meeting categorization
- **isStarred** - Favorite meetings
- **isArchived** - Archive old meetings
- **calendarEventId** - Link to calendar event
- **updatedAt** - Last modification timestamp

#### Enhanced Transcript Segments
- **speakerName** - Name of speaker (optional)
- **isImportant** - Flag important segments
- **notes** - Segment-specific notes

#### UI Improvements
- Calendar icon added to sidebar navigation
- NotesPanel integrated into meeting detail view
- Meeting metadata display with icons (timezone, location, participants)
- Better organized meeting detail layout
- Month calendar grid with event cards

### Changed
- Database schema expanded from 3 to 7 tables
- Meeting model enhanced with 13 new fields
- TranscriptSegment model enhanced with 3 new fields
- IPC API surface expanded with notes, calendar, and tags endpoints
- Meeting detail view reorganized to show all metadata

### Technical Details
- Added 6 new repository classes
- Added 3 new IPC handler modules
- Added 2 new React components
- Total database indexes increased to 14
- Better timezone handling with Intl API
- JSON storage for arrays (participants, attendees, tags)

---

