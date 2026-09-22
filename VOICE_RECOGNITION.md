# Voice Recognition & Speaker Identification

**Feature Status:** Architecture Ready | Implementation Pending  
**Last Updated:** 2026-09-20

---

## 🎯 Overview

WhisNotes supports speaker recognition through two methods:

1. **Speaker Diarization** - Detect different voices in a meeting ✅ Ready
2. **Speaker Profiles** - Learn and auto-identify speakers 🔜 Coming

---

## 🎤 How It Works

### Phase 1: Speaker Diarization (Ready to Implement)

**What It Does:**
- Whisper API detects multiple speakers in audio
- Each speaker assigned a number (Speaker 1, 2, 3...)
- You tag speakers with real names
- Names persist across transcript segments

**Database Structure:**
```sql
transcript_segments:
  - speaker_id (INTEGER)      -- Auto-assigned by AI (1, 2, 3...)
  - speaker_name (TEXT)       -- Your label ("John", "Sarah", etc.)
```

**Workflow:**
1. Record meeting with multiple people
2. AI detects 3 different voices → Speaker 1, 2, 3
3. You tag: Speaker 1 = "John", Speaker 2 = "Sarah", Speaker 3 = "Mike"
4. All their segments automatically get labeled
5. In transcript, see: **John:** "I think we should..."

### Phase 2: Speaker Profiles (Future Enhancement)

**What It Will Do:**
- Create voice profiles for frequent participants
- Analyze voice characteristics (pitch, tone, accent)
- Auto-identify speakers in new meetings
- Learn and improve over time

**How It Would Work:**
1. Create profile for "John" with voice samples
2. In future meetings, AI detects voice → "This is John"
3. Auto-tags all John's segments
4. You confirm or correct if needed

---

## 🗄️ Database Design

### Current Schema (Implemented)

```sql
-- Already exists in transcript_segments
speaker_id INTEGER        -- Detected speaker number
speaker_name TEXT         -- Name you assign
```

### Future Schema (For Speaker Profiles)

```sql
CREATE TABLE speaker_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  photo_url TEXT,
  voice_characteristics TEXT,  -- JSON with voice features
  meeting_count INTEGER DEFAULT 0,
  last_seen DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE speaker_voice_samples (
  id TEXT PRIMARY KEY,
  profile_id TEXT REFERENCES speaker_profiles(id),
  audio_fingerprint TEXT,      -- Voice signature
  confidence REAL,
  source_meeting_id TEXT,
  source_segment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE meeting_speakers (
  meeting_id TEXT REFERENCES meetings(id),
  speaker_profile_id TEXT REFERENCES speaker_profiles(id),
  detected_confidence REAL,     -- How sure AI is
  manually_confirmed BOOLEAN DEFAULT 0,
  PRIMARY KEY (meeting_id, speaker_profile_id)
);
```

---

## 💡 Implementation Approaches

### Option 1: OpenAI Whisper (Built-in)
**Status:** Ready to use  
**How:** Whisper API returns speaker segments  

```typescript
const response = await whisper.transcribe({
  file: audioFile,
  model: 'whisper-1',
  response_format: 'verbose_json',
  enable_speaker_diarization: true,  // Enable this
})

// Response includes:
{
  segments: [
    { speaker: 0, text: "Hello everyone", start: 0.0, end: 2.5 },
    { speaker: 1, text: "Hi there", start: 2.5, end: 4.0 },
    { speaker: 0, text: "Let's begin", start: 4.0, end: 6.0 }
  ]
}
```

### Option 2: Pyannote Audio (Advanced)
**Status:** Future enhancement  
**How:** Dedicated speaker diarization library  

- More accurate speaker detection
- Can create voice embeddings (voice fingerprints)
- Learn speaker identities over time
- Works offline

### Option 3: AssemblyAI (Cloud Service)
**Status:** Alternative option  
**How:** Their API includes speaker diarization  

- Very accurate
- Real-time capable
- Automatic speaker labeling
- Paid service

---

## 🎯 Features

### Current Features (With Whisper)

✅ **Detect Multiple Speakers**
- AI identifies different voices
- Assigns speaker IDs

✅ **Manual Tagging**
- Tag Speaker 1 as "John"
- Tag Speaker 2 as "Sarah"
- Names persist in database

✅ **Display in Transcript**
- See who said what
- Color-code by speaker
- Filter by speaker

### Future Features

🔜 **Speaker Profiles**
- Store speaker information
- Photo, email, role
- Meeting participation history

🔜 **Voice Learning**
- Create voice fingerprints
- Match voices automatically
- Improve accuracy over time

🔜 **Auto-Identification**
- "I recognize this voice - it's John"
- Confidence scores
- Manual confirmation option

🔜 **Speaker Analytics**
- Who spoke most?
- Speaking time distribution
- Interruption patterns
- Sentiment per speaker

---

## 🎨 UI Design

### Meeting Transcript View

```
┌─────────────────────────────────────────────┐
│ 🎤 Speakers in this meeting (3 detected)   │
│                                             │
│ [Speaker 1] → "John Smith" ✏️              │
│ [Speaker 2] → "Sarah Jones" ✏️             │
│ [Speaker 3] → "Not tagged yet" [Tag] ❌    │
└─────────────────────────────────────────────┘

Transcript:
─────────────────────────────────────────────
[00:15] John Smith
"I think we should proceed with option A..."

[00:32] Sarah Jones  
"I agree, but we need to consider the budget..."

[01:05] Speaker 3 (Unknown)
"What about the timeline?" [Who is this?] 👈 Click to tag
```

### Speaker Tagging Modal

```
┌──────────────────────────────────────┐
│ Who is Speaker 3?                    │
│                                      │
│ Name: [_________________]            │
│                                      │
│ Or select from frequent speakers:    │
│ ○ John Smith                         │
│ ○ Sarah Jones                        │
│ ○ Mike Chen                          │
│                                      │
│ [ ] Create speaker profile           │
│                                      │
│ [Cancel]  [Save]                     │
└──────────────────────────────────────┘
```

---

## 🔧 Implementation Plan

### Phase 1: Basic Speaker Detection (Week 6)

1. **Enable Whisper Speaker Diarization**
   - Add `enable_speaker_diarization: true` to API call
   - Parse speaker IDs from response
   - Store in `speaker_id` field

2. **Speaker Tagging UI**
   - Show "Speaker 1, 2, 3" in transcript
   - Click to tag with name
   - Names persist across segments
   - Color-code by speaker

3. **Speaker Summary Panel**
   - List all detected speakers
   - Show speaking time per speaker
   - Quick tag interface

### Phase 2: Speaker Profiles (Week 8)

1. **Profile Database**
   - Create `speaker_profiles` table
   - Store speaker metadata
   - Link to meetings

2. **Profile Management UI**
   - Create/edit profiles
   - Upload photos
   - View participation history

3. **Quick Assignment**
   - Dropdown of known speakers
   - Auto-suggest based on voice patterns

### Phase 3: Voice Learning (Week 10+)

1. **Voice Fingerprinting**
   - Extract voice features
   - Create embeddings
   - Store in database

2. **Auto-Matching**
   - Compare new voice to profiles
   - Confidence scoring
   - Suggest matches

3. **Learning System**
   - Improve over time
   - User feedback loop
   - Update profiles

---

## 📊 Use Cases

### 1. Team Meetings
**Scenario:** Weekly standup with same team  
**Flow:**
1. First meeting: Tag all speakers once
2. Future meetings: AI recognizes voices → auto-tags
3. Review transcript with clear speaker labels

### 2. Client Calls
**Scenario:** Sales calls with different clients  
**Flow:**
1. Client speaks → Tagged as "Client - ABC Corp"
2. Your team members auto-recognized
3. Easy to see client vs. internal discussion

### 3. Interviews
**Scenario:** Job interviews  
**Flow:**
1. Interviewer auto-recognized (your voice profile)
2. Candidate tagged on first question
3. Clear Q&A format in transcript

### 4. Podcasts/Panels
**Scenario:** Multi-speaker recordings  
**Flow:**
1. Each speaker tagged by name
2. Export with speaker labels
3. Generate speaker statistics

---

## 🎬 Example Transcript

**Before Speaker Recognition:**
```
[00:15] "I think we should proceed with option A"
[00:32] "I agree, but we need to consider the budget"
[01:05] "What about the timeline?"
```

**After Speaker Recognition:**
```
[00:15] 👤 John Smith (CEO)
"I think we should proceed with option A"

[00:32] 👤 Sarah Jones (CFO)
"I agree, but we need to consider the budget"

[01:05] 👤 Mike Chen (PM)
"What about the timeline?"
```

**With Analytics:**
```
┌──────────────────────────────────────────┐
│ Meeting Analytics                        │
├──────────────────────────────────────────┤
│ 👤 John Smith:    45% speaking time     │
│ 👤 Sarah Jones:   35% speaking time     │
│ 👤 Mike Chen:     20% speaking time     │
│                                          │
│ Total duration: 45 minutes              │
│ Active speakers: 3                      │
└──────────────────────────────────────────┘
```

---

## 🚀 Quick Start (When Implemented)

### Recording a Meeting
1. Start recording as normal
2. AI detects multiple voices automatically
3. You see "3 speakers detected"

### Tagging Speakers
1. Go to meeting transcript
2. Click "Speaker 1" → Type "John"
3. All Speaker 1 segments now show "John"
4. Repeat for other speakers

### Creating Profiles (Future)
1. Go to Settings → Speaker Profiles
2. Click "Add Profile"
3. Enter name, email, photo
4. System learns voice over time

---

## 💰 Cost Considerations

**Whisper Speaker Diarization:**
- Same cost as regular transcription
- $0.006 per minute
- No extra charge

**Voice Learning (Future):**
- Would use additional storage
- Voice embeddings are small (~1KB per speaker)
- Minimal cost impact

---

## 🔒 Privacy & Ethics

**Important Considerations:**

1. **Consent** - Always inform participants they're being recorded
2. **Speaker Privacy** - Store voice data securely
3. **Data Retention** - Allow deletion of voice profiles
4. **Accuracy** - Confirm speaker IDs, don't blindly trust AI
5. **Bias** - Some accents may be harder to distinguish

**Best Practices:**
- Get explicit consent before recording
- Allow speakers to opt-out of voice profiling
- Provide easy speaker data deletion
- Always show confidence scores
- Allow manual corrections

---

**Summary:** Speaker recognition ready to implement! Database fields exist, just need to enable Whisper's speaker diarization feature and build the tagging UI.
