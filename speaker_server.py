"""
Persistent Speaker Recognition server for WhisNotes.
Extracts voice embeddings and identifies speakers across recordings.

Protocol: one line per request on stdin, one JSON line per response on stdout.

Commands:
  REGISTER|audio_path|speaker_id
    → Extracts embedding from audio, saves as .npy, updates speaker average
    → {"success": true, "speaker_id": "...", "embedding_path": "..."}

  IDENTIFY|audio_path
    → Compares audio against all known speakers, returns best match
    → {"success": true, "speaker_id": "...", "name": "...", "confidence": 0.87, "matches": [...]}

  IDENTIFY_BATCH|audio_path|segments_json
    → For each diarized segment, identifies who is speaking
    → segments_json: [{"speaker_label": "SPEAKER_00", "start": 0.0, "end": 2.5}, ...]
    → {"success": true, "identifications": {"SPEAKER_00": {"speaker_id": "...", "name": "...", "confidence": 0.9}}}

  SIMILARITY|embedding_path1|embedding_path2
    → Cosine similarity between two stored embeddings
    → {"success": true, "similarity": 0.92}

  RELOAD
    → Reload embeddings index from disk (call after adding new speakers)
    → {"success": true, "speaker_count": 5}
"""
import sys
import os
import json
import traceback
import numpy as np
from pathlib import Path

os.environ['PATH'] = ':'.join([
    '/opt/homebrew/bin', '/opt/homebrew/sbin',
    '/usr/local/bin', '/usr/bin', '/bin',
    os.environ.get('PATH', ''),
])

EMBEDDINGS_DIR = Path(os.environ.get('EMBEDDINGS_DIR', str(Path.home() / '.config' / 'whisnotes' / 'speaker-embeddings')))
EMBEDDINGS_DIR.mkdir(parents=True, exist_ok=True)

# Index: { speaker_id -> np.array of shape (256,) } — cached averaged embeddings
_speaker_index: dict[str, np.ndarray] = {}
_encoder = None


def get_encoder():
    global _encoder
    if _encoder is None:
        try:
            from resemblyzer import VoiceEncoder
            _encoder = VoiceEncoder()
            sys.stderr.write("[speaker-server] VoiceEncoder loaded\n")
            sys.stderr.flush()
        except ImportError:
            raise RuntimeError(
                "resemblyzer not installed.\n"
                "Run: pip install resemblyzer"
            )
    return _encoder


def load_index():
    """Load all speaker average embeddings from disk into memory."""
    global _speaker_index
    _speaker_index = {}
    for npy_file in EMBEDDINGS_DIR.glob("*.avg.npy"):
        speaker_id = npy_file.stem.replace('.avg', '')
        try:
            _speaker_index[speaker_id] = np.load(str(npy_file))
        except Exception as e:
            sys.stderr.write(f"[speaker-server] Failed to load {npy_file}: {e}\n")
    sys.stderr.write(f"[speaker-server] Loaded {len(_speaker_index)} speaker(s)\n")
    sys.stderr.flush()


def embed_audio(audio_path: str) -> np.ndarray:
    """Extract a speaker embedding from an audio file."""
    from resemblyzer import preprocess_wav
    wav = preprocess_wav(audio_path)
    encoder = get_encoder()
    embedding = encoder.embed_utterance(wav)
    return embedding  # shape (256,)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a_norm = a / (np.linalg.norm(a) + 1e-8)
    b_norm = b / (np.linalg.norm(b) + 1e-8)
    return float(np.dot(a_norm, b_norm))


def save_embedding(speaker_id: str, embedding: np.ndarray, sample_index: int) -> str:
    """Save a single embedding and update the speaker average."""
    # Save individual sample
    sample_path = EMBEDDINGS_DIR / f"{speaker_id}.sample{sample_index}.npy"
    np.save(str(sample_path), embedding)

    # Recompute average from all samples
    samples = []
    for p in sorted(EMBEDDINGS_DIR.glob(f"{speaker_id}.sample*.npy")):
        samples.append(np.load(str(p)))
    avg = np.mean(samples, axis=0)

    avg_path = EMBEDDINGS_DIR / f"{speaker_id}.avg.npy"
    np.save(str(avg_path), avg)

    # Update in-memory index
    _speaker_index[speaker_id] = avg

    return str(sample_path)


def next_sample_index(speaker_id: str) -> int:
    existing = list(EMBEDDINGS_DIR.glob(f"{speaker_id}.sample*.npy"))
    return len(existing)


# ── Command handlers ──────────────────────────────────────────────────────────

def cmd_register(audio_path: str, speaker_id: str) -> dict:
    if not Path(audio_path).exists():
        return {"success": False, "error": f"Audio file not found: {audio_path}"}

    embedding = embed_audio(audio_path)
    idx = next_sample_index(speaker_id)
    sample_path = save_embedding(speaker_id, embedding, idx)

    return {
        "success": True,
        "speaker_id": speaker_id,
        "embedding_path": sample_path,
        "sample_count": idx + 1,
    }


def cmd_identify(audio_path: str, threshold: float = 0.72) -> dict:
    if not Path(audio_path).exists():
        return {"success": False, "error": f"Audio file not found: {audio_path}"}
    if not _speaker_index:
        return {"success": True, "speaker_id": None, "confidence": 0.0, "matches": []}

    embedding = embed_audio(audio_path)

    scores = []
    for sid, avg_emb in _speaker_index.items():
        sim = cosine_similarity(embedding, avg_emb)
        scores.append({"speaker_id": sid, "confidence": round(sim, 4)})
    scores.sort(key=lambda x: x["confidence"], reverse=True)

    best = scores[0] if scores else {"speaker_id": None, "confidence": 0.0}
    identified = best["confidence"] >= threshold

    return {
        "success": True,
        "speaker_id": best["speaker_id"] if identified else None,
        "confidence": best["confidence"],
        "identified": identified,
        "matches": scores[:5],
    }


def cmd_identify_batch(audio_path: str, segments_json: str) -> dict:
    """
    For each unique diarized speaker label, take a representative audio clip
    and identify who it matches in the database.
    """
    import wave, struct

    if not Path(audio_path).exists():
        return {"success": False, "error": f"Audio file not found: {audio_path}"}

    try:
        segments = json.loads(segments_json)
    except Exception:
        return {"success": False, "error": "Invalid segments JSON"}

    if not _speaker_index:
        return {"success": True, "identifications": {}}

    # Group segments by speaker label, collect time ranges
    speaker_clips: dict[str, list[tuple[float, float]]] = {}
    for seg in segments:
        label = seg.get("speaker_label") or seg.get("speaker", "")
        start = float(seg.get("start", 0))
        end = float(seg.get("end", 0))
        if label and end > start:
            speaker_clips.setdefault(label, []).append((start, end))

    # For each speaker, extract audio and identify
    identifications = {}
    import tempfile

    try:
        with wave.open(audio_path, 'rb') as wf:
            sr = wf.getframerate()
            n_channels = wf.getnchannels()
            samp_width = wf.getsampwidth()
            n_frames = wf.getnframes()
            all_audio = wf.readframes(n_frames)
    except Exception as e:
        return {"success": False, "error": f"Failed to read audio: {e}"}

    for label, clips in speaker_clips.items():
        # Take up to 10 seconds from the first few clips
        target_duration = 10.0
        frames_collected = b''
        for start, end in clips:
            s = int(start * sr) * samp_width * n_channels
            e = int(end * sr) * samp_width * n_channels
            chunk = all_audio[s:e]
            frames_collected += chunk
            if len(frames_collected) >= int(target_duration * sr * samp_width * n_channels):
                break

        if not frames_collected:
            continue

        # Write to temp WAV
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            tmp_path = f.name

        try:
            with wave.open(tmp_path, 'wb') as wf_out:
                wf_out.setnchannels(n_channels)
                wf_out.setsampwidth(samp_width)
                wf_out.setframerate(sr)
                wf_out.writeframes(frames_collected)

            result = cmd_identify(tmp_path)
            if result["success"]:
                identifications[label] = {
                    "speaker_id": result["speaker_id"],
                    "confidence": result["confidence"],
                    "identified": result["identified"],
                }
        finally:
            try: os.unlink(tmp_path)
            except: pass

    return {"success": True, "identifications": identifications}


def cmd_similarity(emb_path1: str, emb_path2: str) -> dict:
    if not Path(emb_path1).exists():
        return {"success": False, "error": f"Not found: {emb_path1}"}
    if not Path(emb_path2).exists():
        return {"success": False, "error": f"Not found: {emb_path2}"}
    a = np.load(emb_path1)
    b = np.load(emb_path2)
    return {"success": True, "similarity": round(cosine_similarity(a, b), 4)}


def cmd_reload() -> dict:
    load_index()
    return {"success": True, "speaker_count": len(_speaker_index)}


# ── Main loop ─────────────────────────────────────────────────────────────────

load_index()
sys.stderr.write(f"[speaker-server] Ready ({len(_speaker_index)} known speakers)\n")
sys.stderr.flush()

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        parts = line.split('|', 3)
        cmd = parts[0].upper()

        if cmd == 'REGISTER' and len(parts) >= 3:
            result = cmd_register(parts[1], parts[2])
        elif cmd == 'IDENTIFY' and len(parts) >= 2:
            result = cmd_identify(parts[1])
        elif cmd == 'IDENTIFY_BATCH' and len(parts) >= 3:
            result = cmd_identify_batch(parts[1], parts[2])
        elif cmd == 'SIMILARITY' and len(parts) >= 3:
            result = cmd_similarity(parts[1], parts[2])
        elif cmd == 'RELOAD':
            result = cmd_reload()
        else:
            result = {"success": False, "error": f"Unknown command: {cmd}"}

    except Exception as e:
        result = {"success": False, "error": str(e), "traceback": traceback.format_exc()}

    sys.stdout.write(json.dumps(result) + '\n')
    sys.stdout.flush()
