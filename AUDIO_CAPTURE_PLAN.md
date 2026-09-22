# macOS Audio Capture Implementation Plan

**Status:** In Progress  
**Target:** Phase 2 - Core Functionality  
**Platform:** macOS (Darwin)

---

## 🎯 Goal

Capture system audio (from Slack, Google Meet, Zoom, etc.) on macOS and stream it to the Whisper transcription service.

---

## 🔍 macOS Audio Capture Options

### Option 1: ScreenCaptureKit API (macOS 13+) ⭐ Recommended
**Pros:**
- Official Apple API (introduced in macOS 13 Ventura)
- Can capture specific app audio
- High quality, low latency
- Built into the system

**Cons:**
- Requires macOS 13+ (Ventura or later)
- Requires Screen Recording permission
- Needs Objective-C++/Swift binding

**How it works:**
```swift
SCStreamConfiguration()
  .captureAudio = true
  .excludeCurrentProcessAudio = true
  .capturesMicrophone = false // or true for mic input
```

### Option 2: BlackHole Virtual Audio Device
**Pros:**
- Works on older macOS versions
- Well-documented
- Easy to use

**Cons:**
- Requires user to install BlackHole manually
- Requires audio routing setup
- Less seamless UX

**How it works:**
1. User installs BlackHole
2. User routes system audio through BlackHole
3. App captures from BlackHole device

### Option 3: node-mic / node-record-lpcm16
**Pros:**
- Pure Node.js, no native code
- Cross-platform

**Cons:**
- Only captures microphone (not system audio)
- Can't capture app audio
- Not suitable for meeting transcription

---

## 🎯 Recommended Approach

**Primary:** ScreenCaptureKit API (Option 1)  
**Fallback:** BlackHole detection + guidance (Option 2)  
**Microphone-only:** node-record-lpcm16 (Option 3)

---

## 🔧 Implementation Strategy

### Phase 1: Simple Microphone Capture (Quick Win)
**Goal:** Get something working fast  
**Tech:** node-record-lpcm16 (Node.js package)  
**Time:** 30 minutes  

**Pros:**
- No native code needed
- Works immediately
- Can test full pipeline (capture → Whisper → UI)

**Cons:**
- Only captures microphone (user's voice)
- Won't capture Google Meet/Slack audio

### Phase 2: ScreenCaptureKit Implementation (Full Solution)
**Goal:** Capture system audio  
**Tech:** Native Objective-C++ with N-API  
**Time:** 3-4 hours  

**Steps:**
1. Create Objective-C++ wrapper for ScreenCaptureKit
2. Build with node-gyp
3. Request Screen Recording permission
4. Capture audio samples
5. Convert to 16kHz mono PCM
6. Stream to main process

### Phase 3: BlackHole Fallback (Compatibility)
**Goal:** Support older macOS  
**Tech:** Detect BlackHole, guide user  
**Time:** 1 hour  

---

## 🚀 Let's Start: Phase 1 (Microphone)

**Quick implementation using node-record-lpcm16:**

1. Install package
2. Create simple recorder service
3. Stream audio chunks
4. Test with real Whisper API
5. Verify end-to-end flow

**Why start here:**
- Validates the entire pipeline
- Gets transcription working today
- Proves the concept
- Easy to implement

**Then we'll upgrade to ScreenCaptureKit for system audio.**

---

## 📦 Dependencies Needed

### For Phase 1 (Microphone - Now)
```json
{
  "node-record-lpcm16": "^1.0.1",
  "wav": "^1.0.2"
}
```

### For Phase 2 (ScreenCaptureKit - Later)
```json
{
  "node-gyp": "^10.0.0",
  "@mapbox/node-pre-gyp": "^1.0.11"
}
```

Native files needed:
- `native/macos/binding.gyp`
- `native/macos/screen_capture.mm` (Objective-C++)
- `native/macos/audio_capture.h`

---

## 🎤 Audio Format Target

**Required for Whisper:**
- Sample Rate: 16kHz
- Channels: Mono
- Bit Depth: 16-bit
- Format: PCM (WAV)

**Conversion needed:**
Most mics capture at 48kHz stereo → Need to resample to 16kHz mono

---

## 🔐 Permissions Required

### Microphone Access (Phase 1)
- macOS will auto-prompt on first use
- Add to `Info.plist`:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>WhisNotes needs microphone access to transcribe meetings.</string>
```

### Screen Recording (Phase 2 - ScreenCaptureKit)
- User must manually enable in System Settings
- Add to `Info.plist`:
```xml
<key>NSScreenCaptureUsageDescription</key>
<string>WhisNotes needs screen recording permission to capture audio from meetings.</string>
```

---

## 🧪 Testing Plan

### Phase 1 Tests
1. Start recording → See audio levels
2. Speak into mic → See waveform
3. Stop recording → Get audio file
4. Send to Whisper → Get transcript
5. Display in UI → See live text

### Phase 2 Tests
1. Play audio from Safari → Capture it
2. Join Google Meet → Capture meeting audio
3. Multiple apps → Select which one to capture
4. Permission denied → Show helpful error

---

## ⚡ Let's Begin!

**Starting with Phase 1: Microphone capture**

This gets us:
✅ Working audio recording  
✅ Real Whisper transcription  
✅ End-to-end pipeline tested  
✅ Foundation for system audio  

Then we upgrade to ScreenCaptureKit for full meeting capture.

**Ready to code?**
