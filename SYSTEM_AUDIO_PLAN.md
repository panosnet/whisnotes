# System Audio Capture - Cross-Platform Implementation

**Date:** 2026-09-21  
**Goal:** Capture Google Meet, Slack, Zoom, Teams, etc. on all platforms  
**Status:** Starting Implementation

---

## 🎯 Objective

Enable WhisNotes to capture audio from meeting applications:
- Google Meet
- Slack Huddles
- Zoom
- Microsoft Teams
- Discord
- Any application with audio

**On all platforms:** macOS, Windows, Linux

---

## 🖥️ Platform-Specific Solutions

### macOS

#### Primary: ScreenCaptureKit (macOS 13+)
**Tech:** Native Objective-C++ with N-API binding

**Pros:**
- ✅ Built into macOS (no extra software)
- ✅ Capture specific app audio
- ✅ High quality, low latency
- ✅ Can exclude own app audio
- ✅ Official Apple API

**Cons:**
- ❌ Requires macOS 13 Ventura+
- ❌ Needs Screen Recording permission
- ❌ Requires native code (complex)

**Implementation:**
```
native/macos/
├── binding.gyp
├── screen_capture_kit.mm
├── audio_capture.h
└── package.json
```

#### Fallback: BlackHole
**Tech:** Detect installed BlackHole device

**Pros:**
- ✅ Works on macOS 10.10+
- ✅ Free, open source
- ✅ Simple to use once installed

**Cons:**
- ❌ User must install separately
- ❌ Manual audio routing needed
- ❌ Captures ALL system audio

**Implementation:**
- Detect BlackHole in audio devices
- Guide user through routing
- Capture from BlackHole device

---

### Windows

#### Primary: WASAPI Loopback
**Tech:** Windows Audio Session API

**Pros:**
- ✅ Built into Windows 7+
- ✅ Capture system audio
- ✅ No extra software
- ✅ Per-app capture on Windows 10+

**Cons:**
- ❌ Requires native C++ code
- ❌ Complex API

**Implementation:**
```
native/windows/
├── binding.gyp
├── wasapi_loopback.cpp
├── audio_capture.h
└── package.json
```

#### Fallback: VB-Cable
**Tech:** Virtual audio cable (like BlackHole)

**Pros:**
- ✅ Free version available
- ✅ Works on older Windows

**Cons:**
- ❌ User must install
- ❌ Limited to stereo in free version

---

### Linux

#### Primary: PulseAudio
**Tech:** PulseAudio `parec` command

**Pros:**
- ✅ Pre-installed on most distros
- ✅ Simple to use
- ✅ Good compatibility

**Implementation:**
```javascript
spawn('parec', [
  '--device=monitor',
  '--format=s16le',
  '--rate=16000',
  '--channels=1'
])
```

#### Modern: PipeWire
**Tech:** Modern audio system (Fedora, Ubuntu 22.10+)

**Pros:**
- ✅ Better performance
- ✅ Lower latency
- ✅ Better app isolation

**Implementation:**
```javascript
spawn('pw-record', [
  '--target=app.sink',
  '--format=s16',
  '--rate=16000',
  '--channels=1'
])
```

#### Fallback: ALSA
**Tech:** Low-level Linux audio

**Pros:**
- ✅ Universal on Linux

**Cons:**
- ❌ More complex

---

## 📋 Implementation Phases

### Phase 2A: macOS (Implementing Now)

**2A.1: ScreenCaptureKit Native Module**
- [ ] Create binding.gyp for node-gyp
- [ ] Write Objective-C++ wrapper
- [ ] Implement SCStream audio capture
- [ ] Request Screen Recording permission
- [ ] Convert audio to 16kHz PCM
- [ ] Stream to Node.js

**2A.2: BlackHole Support**
- [ ] Detect BlackHole devices
- [ ] Add setup instructions
- [ ] Capture from BlackHole
- [ ] Test with Google Meet

**2A.3: UI Updates**
- [ ] Add "Capture Mode" selector
- [ ] App audio picker (for ScreenCaptureKit)
- [ ] Permission status display
- [ ] Setup wizard

**Time:** 2-3 hours

---

### Phase 2B: Windows

**2B.1: WASAPI Implementation**
- [ ] Create C++ binding
- [ ] Implement loopback capture
- [ ] Audio format conversion
- [ ] Build with node-gyp

**2B.2: VB-Cable Detection**
- [ ] Check for VB-Cable device
- [ ] Guide user if not installed

**2B.3: UI Updates**
- [ ] Windows-specific audio picker
- [ ] System requirements check

**Time:** 2 hours

---

### Phase 2C: Linux

**2C.1: PulseAudio**
- [ ] Detect PulseAudio
- [ ] Implement parec capture
- [ ] Monitor source selection

**2C.2: PipeWire**
- [ ] Detect PipeWire
- [ ] Implement pw-record capture
- [ ] Target selection

**2C.3: Auto-Detection**
- [ ] Detect which audio system
- [ ] Use appropriate method

**Time:** 1 hour

---

## 🎨 Updated UI Flow

### Audio Source Selector

```
┌─────────────────────────────────────────┐
│ Audio Source:                           │
│                                         │
│ ○ Microphone (Your voice only)         │
│ ● System Audio (Meeting apps)          │
│                                         │
│ [If System Audio selected:]            │
│                                         │
│ Capture from:                           │
│ ▼ Google Chrome (Google Meet)          │
│   Slack                                 │
│   Zoom.us                              │
│   Microsoft Teams                       │
│   Discord                              │
│   All System Audio                     │
│                                         │
│ Status: ⚠️  Screen Recording Required   │
│ [Grant Permission] [Learn More]        │
└─────────────────────────────────────────┘
```

---

## 🔐 Permissions Needed

### macOS
**Screen Recording Permission:**
- Required for ScreenCaptureKit
- User must enable in System Settings
- One-time setup

**Info.plist entry:**
```xml
<key>NSScreenCaptureUsageDescription</key>
<string>WhisNotes needs screen recording permission to capture audio from meeting applications like Google Meet, Slack, and Zoom.</string>
```

### Windows
**No special permissions needed**
- WASAPI works by default

### Linux
**No special permissions needed**
- PulseAudio/PipeWire work by default

---

## 🧪 Testing Plan

### macOS Tests
1. [ ] Google Meet in Chrome → Capture meeting
2. [ ] Slack desktop app → Capture huddle
3. [ ] Zoom desktop → Capture meeting
4. [ ] Safari YouTube → Verify system audio
5. [ ] Permission denied → Show helpful error
6. [ ] BlackHole installed → Detect and use

### Windows Tests
1. [ ] Google Meet in Edge → Capture
2. [ ] Teams desktop → Capture
3. [ ] Zoom → Capture
4. [ ] System audio playback → Verify

### Linux Tests
1. [ ] Firefox Google Meet → Capture
2. [ ] Discord → Capture
3. [ ] PulseAudio detection → Works
4. [ ] PipeWire detection → Works

---

## 📊 Feature Matrix

| Feature | macOS | Windows | Linux | Status |
|---------|-------|---------|-------|--------|
| Microphone | ✅ | ✅ | ✅ | Done |
| System Audio | 🔄 | ⏳ | ⏳ | In Progress |
| App Selection | 🔄 | ⏳ | ⏳ | Planned |
| Virtual Device | ✅ | ⏳ | ⏳ | Planned |
| Permission UI | 🔄 | - | - | In Progress |

Legend: ✅ Done | 🔄 In Progress | ⏳ Planned | - Not Needed

---

## 💡 User Experience

### First Time (macOS)
1. User clicks "Start Recording"
2. Selects "System Audio"
3. Chooses "Google Chrome (Google Meet)"
4. macOS prompts: "Allow Screen Recording?"
5. User grants permission in System Settings
6. Returns to app, clicks "Start Recording" again
7. Audio captures! ✅

### Subsequent Times
1. Click "Start Recording"
2. Audio captures immediately! ✅

---

## 🚧 Known Limitations

### ScreenCaptureKit (macOS)
- Requires macOS 13+ (Ventura, Sonoma, Sequoia)
- Users on older macOS need BlackHole
- Must grant Screen Recording permission

### WASAPI (Windows)
- Per-app capture requires Windows 10+
- Windows 7-9 only captures all system audio

### PulseAudio (Linux)
- Some distros use ALSA only
- Need fallback for minimal systems

---

## 🎯 Success Criteria

**Phase 2 Complete When:**
- [x] Can capture from microphone (Done!)
- [ ] Can capture Google Meet on macOS
- [ ] Can capture Slack on macOS
- [ ] Can capture Zoom on macOS
- [ ] Works on Windows
- [ ] Works on Linux
- [ ] Still FREE with local Whisper
- [ ] Clear permission instructions
- [ ] Graceful fallbacks

---

## 📝 Implementation Notes

### ScreenCaptureKit API

```objc
// Objective-C++ pseudo-code
SCStreamConfiguration *config = [[SCStreamConfiguration alloc] init];
config.capturesAudio = YES;
config.excludesCurrentProcessAudio = YES;
config.channelCount = 1;
config.sampleRate = 16000;

SCContentFilter *filter = [[SCContentFilter alloc] 
    initWithDesktopIndependentWindow:targetWindow];

SCStream *stream = [[SCStream alloc] 
    initWithFilter:filter 
    configuration:config 
    delegate:self];

[stream startCaptureWithCompletionHandler:^(NSError *error) {
    // Stream started
}];
```

---

**Status:** Ready to implement macOS system audio capture!
