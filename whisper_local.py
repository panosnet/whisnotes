#!/usr/bin/env python3
"""
Local Whisper transcription script
Called by Node.js to transcribe audio files
"""
import sys
import json
import whisper
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

def transcribe_audio(audio_path, language=None, model_name="base"):
    """
    Transcribe audio file using local Whisper model

    Args:
        audio_path: Path to WAV file
        language: Language code (e.g., 'en', 'el', 'cs') or None for auto-detect
        model_name: Whisper model size (tiny, base, small, medium, large)

    Returns:
        JSON with transcription result
    """
    try:
        # Load model (cached after first download)
        model = whisper.load_model(model_name)

        # Transcribe
        result = model.transcribe(
            audio_path,
            language=language,
            verbose=False,
            fp16=False  # Use FP32 for CPU
        )

        # Return result as JSON
        output = {
            "success": True,
            "text": result["text"],
            "language": result.get("language", language or "unknown"),
            "segments": [
                {
                    "text": seg["text"],
                    "start": seg["start"],
                    "end": seg["end"],
                }
                for seg in result.get("segments", [])
            ]
        }

        print(json.dumps(output))
        return 0

    except Exception as e:
        error = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error), file=sys.stderr)
        return 1

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: whisper_local.py <audio_file> [language] [model]"
        }), file=sys.stderr)
        sys.exit(1)

    audio_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "auto" else None
    model_name = sys.argv[3] if len(sys.argv) > 3 else "base"

    sys.exit(transcribe_audio(audio_path, language, model_name))
