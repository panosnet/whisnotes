# WhisNotes - TODO List

**Last Updated:** 2026-09-20  
**Current Phase:** Phase 1 Complete → Starting Phase 2

---

## 🎯 Current Sprint (Phase 2: Core Functionality)

### High Priority - Next Session

- [ ] **macOS Audio Capture**
  - [ ] Research ScreenCaptureKit API documentation
  - [ ] Create Objective-C++ binding with N-API
  - [ ] Implement device enumeration
  - [ ] Implement audio capture start/stop
  - [ ] Add audio format conversion (48kHz → 16kHz)
  - [ ] Test microphone permissions flow
  - [ ] Add error handling for permission denials

- [ ] **Real Whisper Integration**
  - [ ] Test OpenAI API key validation
  - [ ] Implement audio chunking (30s segments)
  - [ ] Add WAV file encoding
  - [ ] Connect to Whisper API
  - [ ] Handle API errors and retries
  - [ ] Add rate limiting
  - [ ] Stream results back to UI

- [ ] **End-to-End Testing**
  - [ ] Record 1-minute test meeting
  - [ ] Verify transcript appears in UI
  - [ ] Check database persistence
  - [ ] Test meeting playback

### Medium Priority

- [ ] **Translation Implementation**
  - [ ] Connect GPT-4 translation API
  - [ ] Add translation caching to database
  - [ ] Batch translation optimization
  - [ ] Add language detection override

- [ ] **Claude Analysis Integration**
  - [ ] Test Anthropic API key
  - [ ] Implement full analysis flow
  - [ ] Parse JSON responses
  - [ ] Add retry logic
  - [ ] Display results in UI

- [ ] **Audio Processing**
  - [ ] Implement overlap in audio chunks
  - [ ] Add volume normalization
  - [ ] Noise reduction (optional)
  - [ ] Better audio visualizer

### Low Priority

- [ ] **UI Polish**
  - [ ] Add loading states
  - [ ] Improve error messages
  - [ ] Add toast notifications
  - [ ] Better empty states

- [ ] **Settings**
  - [ ] Add API usage tracking
  - [ ] Show estimated costs
  - [ ] Add data retention settings

---

## 📋 Phase 2: Core Functionality

### Audio Capture (Week 2-3)

- [ ] **macOS Implementation**
  - [ ] ScreenCaptureKit API integration
  - [ ] BlackHole fallback support
  - [ ] Permission request UI
  - [ ] Audio device hot-plug handling

- [ ] **Windows Implementation**
  - [ ] WASAPI loopback capture
  - [ ] Audio Session API integration
  - [ ] UAC permission handling
  - [ ] Device enumeration

- [ ] **Linux Implementation**
  - [ ] PulseAudio integration
  - [ ] PipeWire support
  - [ ] PolicyKit permissions
  - [ ] Device detection

### Real-Time Transcription (Week 3-4)

- [ ] **Audio Pipeline**
  - [ ] Buffer management (30s chunks)
  - [ ] Overlap handling (2s)
  - [ ] Queue system for processing
  - [ ] Format conversion utilities

- [ ] **Whisper Integration**
  - [ ] API client implementation
  - [ ] Streaming transcription
  - [ ] Language auto-detection
  - [ ] Confidence scoring
  - [ ] Error recovery

- [ ] **UI Updates**
  - [ ] Real-time segment streaming
  - [ ] Auto-scroll improvements
  - [ ] Timestamp accuracy
  - [ ] Visual feedback for processing

---

## 📋 Phase 3: Translation & Multi-Language

- [ ] **Translation Service**
  - [ ] GPT-4 API integration
  - [ ] Batch translation
  - [ ] Translation caching
  - [ ] Cost optimization

- [ ] **UI Enhancements**
  - [ ] Side-by-side view
  - [ ] Language switcher
  - [ ] Translation quality indicator
  - [ ] Edit translation feature

- [ ] **Language Support**
  - [ ] Add more language options
  - [ ] Language detection improvements
  - [ ] Mixed-language handling

---

## 📋 Phase 4: AI Analysis

- [ ] **Analysis Implementation**
  - [ ] Claude API integration
  - [ ] Summary generation
  - [ ] Key point extraction
  - [ ] Action item detection
  - [ ] Topic clustering

- [ ] **Speaker Diarization**
  - [ ] Integrate speaker detection
  - [ ] Speaker labeling UI
  - [ ] Speaker statistics

- [ ] **Advanced Features**
  - [ ] Sentiment analysis (optional)
  - [ ] Question detection
  - [ ] Decision tracking

---

## 📋 Phase 5: Export & Search

- [ ] **Export Functionality**
  - [ ] JSON export (complete data)
  - [ ] TXT export (clean transcript)
  - [ ] PDF export (formatted)
  - [ ] DOCX export (Word document)
  - [ ] SRT export (subtitles)

- [ ] **Search Features**
  - [ ] Full-text search implementation
  - [ ] Search within transcript
  - [ ] Filter by date range
  - [ ] Filter by language
  - [ ] Filter by source app
  - [ ] Search highlights

- [ ] **Organization**
  - [ ] Tags/labels for meetings
  - [ ] Folders/categories
  - [ ] Favorites/starred
  - [ ] Archive feature

---

## 📋 Phase 6: Polish & UX

- [ ] **Keyboard Shortcuts**
  - [ ] Start/Stop recording (Cmd+R)
  - [ ] New meeting (Cmd+N)
  - [ ] Search (Cmd+F)
  - [ ] Settings (Cmd+,)
  - [ ] Shortcuts help modal

- [ ] **System Integration**
  - [ ] Menu bar icon
  - [ ] System tray integration
  - [ ] Global hotkeys
  - [ ] Dock badge (recording indicator)

- [ ] **Accessibility**
  - [ ] Screen reader support
  - [ ] Keyboard navigation
  - [ ] High contrast mode
  - [ ] Font size settings

- [ ] **Onboarding**
  - [ ] Welcome screen
  - [ ] Setup wizard
  - [ ] Sample meeting
  - [ ] Tooltips and hints

---

## 📋 Phase 7: Testing & Quality

- [ ] **Unit Tests**
  - [ ] Audio service tests
  - [ ] Database repository tests
  - [ ] AI service tests
  - [ ] Utility function tests
  - [ ] Store tests

- [ ] **Integration Tests**
  - [ ] IPC communication tests
  - [ ] Database integration tests
  - [ ] API integration tests

- [ ] **E2E Tests**
  - [ ] Recording workflow
  - [ ] Meeting management
  - [ ] Settings persistence
  - [ ] Export functionality
  - [ ] Search functionality

- [ ] **Performance Testing**
  - [ ] Memory leak detection
  - [ ] Long meeting handling (3+ hours)
  - [ ] Large database performance (1000+ meetings)
  - [ ] API rate limit handling

- [ ] **Cross-Platform Testing**
  - [ ] macOS (Intel + Apple Silicon)
  - [ ] Windows 10/11
  - [ ] Ubuntu Linux
  - [ ] Fedora Linux

---

## 📋 Phase 8: Distribution

- [ ] **Build System**
  - [ ] macOS code signing
  - [ ] macOS notarization
  - [ ] Windows code signing
  - [ ] Linux packaging

- [ ] **Auto-Update**
  - [ ] Update server setup
  - [ ] Version checking
  - [ ] Download and install
  - [ ] Rollback mechanism

- [ ] **Documentation**
  - [ ] User guide
  - [ ] API documentation
  - [ ] Troubleshooting guide
  - [ ] FAQ

- [ ] **Distribution Channels**
  - [ ] Direct download website
  - [ ] Homebrew cask
  - [ ] Chocolatey package
  - [ ] Snap store
  - [ ] Flatpak

---

## 🐛 Known Issues to Fix

### Critical
None currently

### Major
- [ ] Audio capture not functional (Phase 2 priority)
- [ ] AI services return mock data (Phase 2 priority)
- [ ] Export features not implemented (Phase 5)

### Minor
- [ ] Deprecation warnings from dependencies
- [ ] Missing app icon
- [ ] No keyboard shortcuts
- [ ] No loading states in UI
- [ ] Error messages could be better

---

## 💡 Feature Ideas (Future Considerations)

### v2.0 Features
- [ ] Offline mode with local Whisper model
- [ ] Cloud sync (optional, encrypted)
- [ ] Mobile companion app
- [ ] Calendar integration (Google/Outlook)
- [ ] Automatic meeting detection
- [ ] Video recording support
- [ ] Screen capture with transcript
- [ ] Multi-user collaboration
- [ ] Custom AI models
- [ ] Plugin system
- [ ] Zapier/API integrations
- [ ] Meeting templates
- [ ] Custom prompts for analysis
- [ ] Voice commands
- [ ] Real-time collaboration

### Integration Ideas
- [ ] Slack integration
- [ ] Zoom plugin
- [ ] Google Meet extension
- [ ] Microsoft Teams integration
- [ ] Notion export
- [ ] Obsidian export
- [ ] Roam Research export

---

## 📊 Technical Debt

- [ ] Add proper error boundaries in React
- [ ] Implement logging system
- [ ] Add analytics (privacy-respecting)
- [ ] Optimize bundle size
- [ ] Add performance monitoring
- [ ] Improve TypeScript coverage
- [ ] Add JSDoc comments
- [ ] Refactor large components
- [ ] Extract common utilities
- [ ] Add ESLint configuration
- [ ] Add Prettier configuration
- [ ] Set up CI/CD pipeline

---

## 📝 Documentation Needed

- [ ] API documentation (for IPC)
- [ ] Contributing guide
- [ ] Development setup guide
- [ ] Architecture decision records
- [ ] Code style guide
- [ ] Testing guidelines
- [ ] Release process documentation
- [ ] Security policy
- [ ] Privacy policy

---

## 🎓 Learning & Research

- [ ] ScreenCaptureKit API best practices
- [ ] WASAPI documentation
- [ ] PulseAudio/PipeWire differences
- [ ] Audio processing techniques
- [ ] Whisper API optimization
- [ ] Claude API best practices
- [ ] Electron security guidelines
- [ ] SQLite performance tuning
- [ ] React performance patterns
- [ ] Zustand advanced patterns

---

**Next Action:** Start Phase 2 - Implement macOS audio capture with ScreenCaptureKit API
