from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from pathlib import Path
from tempfile import NamedTemporaryFile
import os
import requests
import torch
import torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

app = FastAPI(title="SoolenAI Open Voice Engine", version="0.1.1")
MODEL = None
LANGUAGE_MAP = {"zh": "zh", "en": "en", "ja": "ja", "fr": "fr", "ms": "ms", "es": "es", "de": "de"}

class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    language: str
    voice: str = "soolenai"
    voice_sample_url: str

def get_model():
    global MODEL
    if MODEL is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        MODEL = ChatterboxMultilingualTTS.from_pretrained(device=device, t3_model="v3")
    return MODEL

def download_sample(url: str) -> str:
    allow_hosts = [h.strip() for h in os.getenv("SOOLENAI_SAMPLE_ALLOWED_HOSTS", "").split(",") if h.strip()]
    if not allow_hosts:
        raise HTTPException(503, "SOOLENAI_SAMPLE_ALLOWED_HOSTS is not configured")
    from urllib.parse import urlparse
    host = urlparse(url).hostname
    if host not in allow_hosts:
        raise HTTPException(403, "Voice sample host is not allowed")
    r = requests.get(url, timeout=30)
    if r.status_code != 200 or not r.content:
        raise HTTPException(502, "Unable to fetch the approved voice sample")
    with NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(r.content)
        return f.name

@app.get("/health")
def health():
    return {"ok": True, "engine": "chatterbox_multilingual_v3", "voice": "soolenai"}

@app.post("/tts")
def tts(req: TTSRequest):
    if req.voice.lower() != "soolenai":
        raise HTTPException(400, "Only the SoolenAI voice is enabled")
    language = LANGUAGE_MAP.get(req.language)
    if not language:
        raise HTTPException(400, "Unsupported language")
    sample = download_sample(req.voice_sample_url)
    out = None
    try:
        model = get_model()
        wav = model.generate(req.text, language_id=language, audio_prompt_path=sample)
        if wav.dim() == 1:
            wav = wav.unsqueeze(0)
        out = NamedTemporaryFile(suffix=".wav", delete=False).name
        torchaudio.save(out, wav.cpu(), model.sr)
        return Response(content=Path(out).read_bytes(), media_type="audio/wav")
    finally:
        for path in [sample, out]:
            if path:
                try: os.remove(path)
                except OSError: pass
