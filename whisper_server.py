"""
Persistent Whisper server — loads the model once, transcribes on demand.
Reads one request per line from stdin: "audio_path|language|model"
Writes one JSON result per line to stdout.
"""
import sys
import os
import json
import math
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

current_model_name = None
current_model = None
current_device = None

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
    # avg_logprob is typically between -1.0 (bad) and 0.0 (perfect)
    clamped = max(-1.0, min(0.0, avg_logprob))
    return round(1.0 + clamped, 3)  # -1→0.0, -0.5→0.5, 0→1.0

def transcribe(audio_path, language, model_name):
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
                "confidence": logprob_to_confidence(s.get("avg_logprob", -0.5))
            }
            for s in segs
        ]
    }

sys.stderr.write("[whisper-server] Ready\n")
sys.stderr.flush()

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        parts = line.split("|", 2)
        if len(parts) < 3:
            raise ValueError(f"Invalid request format: {line}")
        audio_path, language, model_name = parts
        result = transcribe(audio_path, language, model_name)
    except Exception as e:
        result = {"success": False, "error": str(e), "traceback": traceback.format_exc()}

    sys.stdout.write(json.dumps(result) + "\n")
    sys.stdout.flush()
