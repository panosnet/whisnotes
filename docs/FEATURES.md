# WhisNotes — Feature Reference

## Recording

### Starting a Recording

1. Click **Record** (microphone icon) in the sidebar
2. Set an optional **Meeting Title** (auto-generated if left blank)
3. Select **Audio Source**:
   - **Microphone (Your Voice)** — records from your mic, no permissions needed
   - **System Audio** — captures everything playing on your computer
4. Select **Language** (or leave as Auto-detect)
5. Click **Start Recording**

### During Recording

- **Elapsed timer** shows recording duration in red
- **Segment counter** shows how many transcript segments have arrived
- **Audio visualizer** shows live volume levels
- **Transcript** appears below in real-time as Whisper processes each speech chunk

### Voice Activity Detection (VAD)

WhisNotes doesn't record in fixed chunks — it uses VAD to detect when you're speaking:
- Transcription fires after ~400ms of silence (near real-time feel)
- Very short clips (<200ms) are ignored
- Long continuous speech is split every 8 seconds
- The model stays loaded in RAM between chunks (no reload delay)

### Stopping a Recording

Click **Stop Recording**. The app:
1. Flushes any remaining buffered audio to Whisper
2. Shows a "Transcribing speech…" spinner while processing
3. Saves the audio file to disk for playback
4. Shows a **View Recording** button when complete

### Global Shortcut

**`⌘⌥R`** (macOS) starts or stops recording from any app — even when WhisNotes is in the background. The floating mini recorder overlay appears automatically to show status.

---

## Transcription

### How It Works

1. Your speech is detected by VAD
2. A WAV file is created from the audio chunk
3. It's sent to the persistent `whisper_server.py` process via stdin
4. Whisper transcribes it (model stays in RAM — no reload)
5. JSON result comes back, segment saved to SQLite, pushed to UI

### Models

Downloaded via Settings → Transcription. Stored in `~/.cache/whisper/`.

The system info panel shows your CPU, RAM, and auto-recommends the best model.

### Inline Editing

In any meeting, hover over a transcript segment — a ✏️ icon appears. Click to edit inline:
- Correct Whisper mistakes (names, technical terms, accents)
- `Cmd+Enter` to save
- `Esc` to cancel
- Changes persist to the database

### Speaker Diarization

With WhisperX installed and a HuggingFace token configured:
- Each segment shows a color-coded speaker badge
- **Speaker 1** = blue, **Speaker 2** = green, **Speaker 3** = orange, etc.
- Click a speaker badge to rename it (e.g., "Speaker 1" → "Panos")
- Names persist per-meeting in local state

**To install:**
```bash
source venv/bin/activate
pip install whisperx
```
Then enable in Settings → Transcription → Speaker Diarization.

---

## Audio Playback

Every recording is saved automatically. In any meeting with a recording:

- An **audio player** appears below the meeting header
- **Play/Pause** — standard controls
- **Timeline** — click to seek anywhere
- **Segment sync** — the currently-playing segment is highlighted blue
- **Click any timestamp** `[MM:SS]` in the transcript → audio seeks to that moment

Recordings saved at: `~/Library/Application Support/whisnotes/recordings/{meetingId}.wav`

---

## AI Features

### Analysis

Click **Analyze** in any meeting detail to generate:

**Summary** — 2–3 sentence overview of the meeting
**Key Points** — 3–5 most important discussion points  
**Action Items** — tasks extracted from the conversation, with priority (High/Medium/Low)  
**Topics** — main themes covered

Results are saved to the database and available immediately on next open.

Click **Re-analyze** to re-run with different settings or after adding more context.

### Translation

Click **Translation** in any meeting — the transcript is translated segment by segment using your configured AI provider.

The translation target is automatically the opposite of the source language (e.g., English meeting → Greek translation). Translations are saved per-segment and shown below each segment when the toggle is on.

### Providers

Both Analysis and Translation use the same configured provider (Settings → AI Providers):

| Provider | Analysis quality | Speed | Cost |
|---|---|---|---|
| Ollama (llama3, mistral) | Great | Depends on model | Free |
| Ollama (phi3) | Good | Fast | Free |
| Claude (Haiku) | Excellent | Fast | Very cheap |
| GPT-4o mini | Excellent | Fast | Very cheap |

---

## Notes

### Adding Notes

In any meeting, scroll to the **Notes** section. Click **+ Add Note** and:
- Type your note content (`Cmd+Enter` to save)
- Select a type from the dropdown

### Note Types

| Type | Color | Use for |
|---|---|---|
| General | Gray | Free-form notes |
| Question | Blue | Follow-up questions |
| Action | Green | Tasks and to-dos |
| Decision | Purple | Decisions made |
| Idea | Yellow | Ideas to explore |

### Managing Notes

- **Pin** — click the pin icon to float a note to the top
- **Edit** — click the pencil icon to edit in place (`Cmd+Enter` to save)
- **Delete** — click trash icon (instant, optimistic, rolls back on error)

---

## Tags

### Adding Tags

In any meeting header, click **+ Tag**:
- Type to create a new tag (gets a random color)
- Start typing to search existing tags
- Click a suggestion to add it
- Press `Enter` to create and add a new tag

### Removing Tags

Hover over a tag — a × button appears. Click it.

### Tag Colors

Tags get a random color on creation from a palette of 10 colors. Colors are consistent across all meetings using the same tag.

---

## Search

The search box in the **Meetings** list searches:
- Meeting titles
- All transcript content (via SQLite FTS5 full-text index)

Debounced 300ms — results appear as you type. Clearing the search instantly shows all meetings.

---

## Export

From any meeting, click **Export** to save in 5 formats:

### Text (.txt)
```
[00:15] Hello, welcome to today's meeting
[00:32] Let's start with a quick status update
...
```

### Markdown (.md)
```markdown
# Meeting Title

**Date:** September 23, 2026, 2:30 PM
**Language:** EN

## Transcript

`[00:15]` Hello, welcome to today's meeting
`[00:32]` Let's start with a quick status update
...
```

### JSON (.json)
Full meeting object + all transcript segments as structured data. Useful for integrations or archiving.

### SRT Subtitles (.srt)
```
1
00:00:15,000 --> 00:00:32,000
Hello, welcome to today's meeting

2
00:00:32,000 --> 00:00:47,000
Let's start with a quick status update
```

Use SRT to add captions to your recorded video in any video editor.

### PDF (.pdf)
A formatted document with meeting title, date, language, and the full transcript with timestamps. Rendered via a hidden Chromium window for accurate formatting.

---

## Copy to Clipboard

In the meeting transcript section:
- **📋 Copy** — plain text with `[MM:SS]` timestamps
- **⬇ Markdown** — formatted Markdown ready to paste into Notion, Obsidian, or any wiki

---

## Calendar

### Month View

- Each day shows: meeting count, total duration, transcript segment count
- Star icon if any meeting is starred, mic/monitor icon for recording source
- Click a day → right panel shows all meetings for that day
- Click a meeting card → opens meeting detail

### Week View

- 7-column grid for the current week
- Each day shows meeting cards
- Navigate with prev/next arrows
- Click **Today** to jump to the current week and open today's panel

### Stats Bar

At the top: total meetings this month, total time, average per day, starred count, most active day.

---

## Meeting Organization

### Starring

Click the ★ button in any meeting to star it. Starred meetings:
- Show a ★ in the meeting list
- Are counted in Calendar stats
- Can be filtered (future feature)

### Delete

In the meeting list: hover → trash icon → confirmation modal.
In meeting detail: trash icon in top-right → confirmation modal.

Deletion cascades to all segments, notes, and calendar events (SQLite foreign key constraints).

---

## Settings

### Transcription

**Mode:**
- **Local FREE** — Whisper runs on your Mac, completely offline
- **OpenAI API** — faster, uses your OpenAI API key, costs ~$0.006/minute

**Model:** Download any of 11 models. The download manager shows:
- ✅ Already downloaded
- ⬇️ Download button with live progress bar
- ⭐ "Best for you" badge based on your hardware
- RAM fit indicator (Fits great / Fits OK / May be slow)

**Speaker Diarization:**
- Toggle to enable WhisperX
- HuggingFace token field (free token required)
- Note about pip install requirement

### AI Providers

Select one provider for both Analysis and Translation:
- **None** — disable AI features
- **Ollama** — auto-detects running instance, hardware-aware model suggestions, ⭐ recommended badge
- **Claude** — uses claude-haiku for translation, claude-sonnet for analysis
- **GPT-4** — uses gpt-4o-mini for translation, gpt-4o for analysis

### API Keys

- OpenAI API Key — for Whisper API mode and GPT-4 analysis
- Anthropic API Key — for Claude analysis
- Stored locally in `electron-store`, never sent anywhere except their respective APIs

### Language

Default language for new recordings. Choices: Auto-detect, English, Greek (Ελληνικά), Czech (Čeština).

Auto-detect uses Whisper's built-in language detection per segment.

### Appearance

- **System** — follows your macOS/Windows/Linux dark/light setting, updates live when you change it
- **Dark** — always dark
- **Light** — always light

---

## System Requirements

| | Minimum | Recommended |
|---|---|---|
| macOS | 13.0 (Ventura) for system audio | 14.0+ (Sonoma) |
| Windows | Windows 10 | Windows 11 |
| Linux | Ubuntu 20.04 / Fedora 34 | Latest LTS |
| RAM | 4 GB (tiny model) | 8 GB (small model) |
| Storage | 500 MB | 5 GB (for multiple models) |
| Python | 3.8+ | 3.11+ |
| Node.js | 22 LTS | 22 LTS |

**Apple Silicon (M1/M2/M3/M4):** WhisperX automatically uses Metal GPU acceleration, giving 2–4× speedup over CPU-only transcription.
