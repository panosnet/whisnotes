"""
Persistent Whisper server — loads the model once, transcribes on demand.
Reads one request per line from stdin: "audio_path|language|model_name|diarize"
  diarize: "1" to enable speaker diarization (requires whisperx), "0" otherwise
Writes one JSON result per line to stdout.
"""
import sys
import os
import json
import traceback

# Ensure Homebrew and common tool paths are available (needed when launched from Electron)
os.environ['PATH'] = ':'.join([
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    os.environ.get('PATH', ''),
])

# Try to import WhisperX for speaker diarization
try:
    import whisperx
    WHISPERX_AVAILABLE = True
except ImportError:
    WHISPERX_AVAILABLE = False

current_model_name = None
current_model = None
current_device = None
current_whisperx_model = None

def get_device():
    """Detect best available compute device."""
    try:
        import torch
        if torch.backends.mps.is_available():
            return "mps"
        if torch.cuda.is_available():
            return "cuda"
    except Exception:
        pass
    return "cpu"

def load_model_if_needed(model_name):
    global current_model_name, current_model, current_device
    if current_model_name != model_name:
        import whisper
        device = get_device()
        current_device = device
        sys.stderr.write(f"[whisper-server] Loading model: {model_name} on {device}\n")
        sys.stderr.flush()
        current_model = whisper.load_model(model_name, device=device)
        current_model_name = model_name
        sys.stderr.write(f"[whisper-server] Model loaded: {model_name}\n")
        sys.stderr.flush()

def logprob_to_confidence(avg_logprob):
    """Convert average log-probability to a 0-1 confidence score."""
    clamped = max(-1.0, min(0.0, avg_logprob))
    return round(1.0 + clamped, 3)

def speaker_label_to_id(speaker: str) -> int:
    """Convert 'SPEAKER_00' -> 0, 'SPEAKER_01' -> 1, etc."""
    try:
        return int(speaker.split('_')[-1])
    except Exception:
        return 0

def transcribe_with_diarization(audio_path, language, model_name):
    """Use WhisperX for word-level alignment + speaker diarization."""
    global current_whisperx_model

    device = get_device()
    compute_type = "float16" if device in ("cuda", "mps") else "int8"

    sys.stderr.write(f"[whisper-server] WhisperX transcribing with diarization on {device}\n")
    sys.stderr.flush()

    # Load WhisperX model (cached separately from plain whisper)
    if current_whisperx_model is None or getattr(current_whisperx_model, '_model_name', None) != model_name:
        current_whisperx_model = whisperx.load_model(model_name, device, compute_type=compute_type)
        current_whisperx_model._model_name = model_name

    lang = None if language == "auto" else language
    result = current_whisperx_model.transcribe(audio_path, language=lang)
    detected_lang = result.get("language", language)

    # Word-level alignment
    try:
        model_a, metadata = whisperx.load_align_model(language_code=detected_lang, device=device)
        result = whisperx.align(result["segments"], model_a, metadata, audio_path, device)
    except Exception as e:
        sys.stderr.write(f"[whisper-server] Alignment failed: {e}, skipping\n")
        sys.stderr.flush()

    # Diarization (no HuggingFace token needed for basic usage)
    try:
        diarize_model = whisperx.DiarizationPipeline(device=device)
        diarize_segments = diarize_model(audio_path)
        result = whisperx.assign_word_speakers(diarize_segments, result)
    except Exception as e:
        sys.stderr.write(f"[whisper-server] Diarization failed: {e}, returning without speakers\n")
        sys.stderr.flush()

    segs = result.get("segments", [])
    full_text = " ".join(s.get("text", "").strip() for s in segs)

    out_segments = []
    for s in segs:
        speaker_str = s.get("speaker", "SPEAKER_00")
        out_segments.append({
            "text": s.get("text", "").strip(),
            "start": s.get("start", 0.0),
            "end": s.get("end", 0.0),
            "speaker": speaker_str,
            "speakerId": speaker_label_to_id(speaker_str),
            "confidence": 0.9,
        })

    return {
        "success": True,
        "text": full_text.strip(),
        "language": detected_lang,
        "confidence": 0.9,
        "segments": out_segments,
        "diarized": True,
    }

def transcribe_plain(audio_path, language, model_name):
    load_model_if_needed(model_name)
    lang = None if language == "auto" else language
    use_fp16 = (current_device == "mps" or current_device == "cuda")
    result = current_model.transcribe(audio_path, language=lang, fp16=use_fp16)

    segs = result.get("segments", [])
    if segs:
        avg_logprob = sum(s.get("avg_logprob", -0.5) for s in segs) / len(segs)
        confidence = logprob_to_confidence(avg_logprob)
    else:
        confidence = 0.0

    return {
        "success": True,
        "text": result.get("text", "").strip(),
        "language": result.get("language", language),
        "confidence": confidence,
        "segments": [
            {
                "text": s["text"],
                "start": s["start"],
                "end": s["end"],
                "confidence": logprob_to_confidence(s.get("avg_logprob", -0.5)),
                "speakerId": None,
            }
            for s in segs
        ],
        "diarized": False,
    }

sys.stderr.write(f"[whisper-server] Ready (whisperx={'available' if WHISPERX_AVAILABLE else 'not installed'})\n")
sys.stderr.flush()

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        parts = line.split("|", 3)
        if len(parts) < 3:
            raise ValueError(f"Invalid request format: {line}")
        audio_path = parts[0]
        language = parts[1]
        model_name = parts[2]
        diarize = len(parts) > 3 and parts[3] == "1"

        if diarize and WHISPERX_AVAILABLE:
            result = transcribe_with_diarization(audio_path, language, model_name)
        else:
            result = transcribe_plain(audio_path, language, model_name)
    except Exception as e:
        result = {"success": False, "error": str(e), "traceback": traceback.format_exc()}

    sys.stdout.write(json.dumps(result) + "\n")
    sys.stdout.flush()
