"""
Persistent TTS / Voice Cloning server for WhisNotes.
Uses Coqui XTTS-v2 for local, free, high-quality voice cloning.

Protocol: one line per request on stdin, one JSON line per response on stdout.

Commands:
  CLONE|sample_wav_path|voice_id
    → Extracts speaker embedding from sample WAV, saves to voices/ dir
    → {"success": true, "voice_id": "...", "duration_secs": 5.2}

  SPEAK|text|voice_id|output_wav_path
    → Synthesises speech in cloned voice, writes WAV to output_wav_path
    → {"success": true, "path": "...", "duration_secs": 2.1}

  STREAM_START|voice_id
    → Prepares real-time voice conversion mode
    → {"success": true}

  STREAM_CHUNK|base64_pcm_int16_16khz
    → Converts one audio chunk; returns same-format PCM base64
    → {"success": true, "audio_b64": "..."}

  STREAM_STOP
    → Ends real-time mode
    → {"success": true}
"""
import sys
import os
import json
import traceback
import base64
import struct
import tempfile
from pathlib import Path

# Ensure Homebrew tools are on PATH (needed when launched from Electron)
os.environ['PATH'] = ':'.join([
    '/opt/homebrew/bin', '/opt/homebrew/sbin',
    '/usr/local/bin', '/usr/bin', '/bin',
    os.environ.get('PATH', ''),
])

# ── Lazy-load heavy dependencies ──────────────────────────────────────────────

tts_model = None
current_voice_id = None

VOICES_DIR = Path(os.environ.get('VOICES_DIR', str(Path.home() / '.config' / 'whisnotes' / 'voices')))
VOICES_DIR.mkdir(parents=True, exist_ok=True)

def get_tts():
    global tts_model
    if tts_model is None:
        try:
            from TTS.api import TTS
            # XTTS-v2: best quality, supports 17 languages, fast inference
            tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
            sys.stderr.write("[tts-server] XTTS-v2 loaded\n")
            sys.stderr.flush()
        except Exception as e:
            raise RuntimeError(f"Failed to load TTS model: {e}\nRun: pip install TTS")
    return tts_model


# ── Helpers ───────────────────────────────────────────────────────────────────

def embedding_path(voice_id: str) -> Path:
    return VOICES_DIR / f"{voice_id}.wav"


def pcm_to_wav_bytes(pcm_bytes: bytes, sample_rate: int = 16000, channels: int = 1) -> bytes:
    """Wrap raw int16 PCM bytes in a RIFF WAV header."""
    bits_per_sample = 16
    data_size = len(pcm_bytes)
    header = struct.pack('<4sI4s4sIHHIIHH4sI',
        b'RIFF', 36 + data_size, b'WAVE',
        b'fmt ', 16,
        1,  # PCM
        channels, sample_rate,
        sample_rate * channels * bits_per_sample // 8,
        channels * bits_per_sample // 8,
        bits_per_sample,
        b'data', data_size)
    return header + pcm_bytes


def audio_duration(wav_path: str) -> float:
    """Return duration in seconds without soundfile dependency."""
    try:
        import wave
        with wave.open(wav_path, 'rb') as f:
            return f.getnframes() / float(f.getframerate())
    except Exception:
        return 0.0


# ── Command handlers ──────────────────────────────────────────────────────────

def cmd_clone(sample_wav_path: str, voice_id: str) -> dict:
    """Copy the sample WAV as the reference embedding for this voice."""
    import shutil
    src = Path(sample_wav_path)
    if not src.exists():
        return {"success": False, "error": f"Sample file not found: {sample_wav_path}"}
    dst = embedding_path(voice_id)
    shutil.copy2(src, dst)
    duration = audio_duration(str(dst))
    sys.stderr.write(f"[tts-server] Cloned voice '{voice_id}' from {sample_wav_path} ({duration:.1f}s)\n")
    sys.stderr.flush()
    return {"success": True, "voice_id": voice_id, "duration_secs": duration}


def cmd_speak(text: str, voice_id: str, output_wav_path: str) -> dict:
    """Synthesise speech in the cloned voice and write to output_wav_path."""
    ref = embedding_path(voice_id)
    if not ref.exists():
        return {"success": False, "error": f"Voice profile not found: {voice_id}"}
    if not text.strip():
        return {"success": False, "error": "Empty text"}

    tts = get_tts()
    tts.tts_to_file(
        text=text,
        speaker_wav=str(ref),
        language="en",
        file_path=output_wav_path,
    )
    duration = audio_duration(output_wav_path)
    sys.stderr.write(f"[tts-server] Synthesised {len(text)} chars → {output_wav_path} ({duration:.1f}s)\n")
    sys.stderr.flush()
    return {"success": True, "path": output_wav_path, "duration_secs": duration}


def cmd_stream_start(voice_id: str) -> dict:
    """Prepare real-time voice conversion mode."""
    global current_voice_id
    ref = embedding_path(voice_id)
    if not ref.exists():
        return {"success": False, "error": f"Voice profile not found: {voice_id}"}
    current_voice_id = voice_id
    # Pre-warm model
    get_tts()
    return {"success": True, "voice_id": voice_id}


def cmd_stream_chunk(b64_pcm: str) -> dict:
    """
    Convert one 200ms PCM chunk (int16, 16kHz, mono) to the cloned voice.
    Returns base64-encoded PCM of the converted audio.
    """
    if not current_voice_id:
        return {"success": False, "error": "Call STREAM_START first"}

    raw_pcm = base64.b64decode(b64_pcm)

    # Write input to temp WAV, convert, read back
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f_in:
        f_in.write(pcm_to_wav_bytes(raw_pcm))
        in_path = f_in.name

    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f_out:
        out_path = f_out.name

    try:
        ref = embedding_path(current_voice_id)
        tts = get_tts()
        # For real-time: transcribe input first, then re-synthesise in cloned voice
        # (full voice conversion pipeline via XTTS)
        import whisper as _whisper
        _model = _whisper.load_model("tiny")  # tiny for low latency
        result = _model.transcribe(in_path, language=None, fp16=False)
        text = result.get("text", "").strip()

        if text:
            tts.tts_to_file(
                text=text,
                speaker_wav=str(ref),
                language=result.get("language", "en"),
                file_path=out_path,
            )
            with open(out_path, 'rb') as f:
                out_wav = f.read()
            # Strip WAV header (44 bytes) to return raw PCM
            pcm_out = out_wav[44:]
        else:
            pcm_out = raw_pcm  # pass through silence

        return {"success": True, "audio_b64": base64.b64encode(pcm_out).decode()}
    finally:
        os.unlink(in_path)
        try: os.unlink(out_path)
        except: pass


def cmd_stream_stop() -> dict:
    global current_voice_id
    current_voice_id = None
    return {"success": True}


# ── Main loop ─────────────────────────────────────────────────────────────────

sys.stderr.write("[tts-server] Ready\n")
sys.stderr.flush()

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        parts = line.split('|', 3)
        cmd = parts[0].upper()

        if cmd == 'CLONE' and len(parts) >= 3:
            result = cmd_clone(parts[1], parts[2])
        elif cmd == 'SPEAK' and len(parts) >= 4:
            result = cmd_speak(parts[1], parts[2], parts[3])
        elif cmd == 'STREAM_START' and len(parts) >= 2:
            result = cmd_stream_start(parts[1])
        elif cmd == 'STREAM_CHUNK' and len(parts) >= 2:
            result = cmd_stream_chunk(parts[1])
        elif cmd == 'STREAM_STOP':
            result = cmd_stream_stop()
        else:
            result = {"success": False, "error": f"Unknown command: {cmd}"}

    except Exception as e:
        result = {"success": False, "error": str(e), "traceback": traceback.format_exc()}

    sys.stdout.write(json.dumps(result) + '\n')
    sys.stdout.flush()
