# SoolenAI Open Voice Engine

Self-hosted voice service for LANERIQ AI using Chatterbox Multilingual. It is the default SoolenAI voice provider; paid providers remain optional.

## Server environment

- `SOOLENAI_SAMPLE_ALLOWED_HOSTS`: comma-separated allowlist for the private object-storage host.

Keep the approved SoolenAI voice sample out of GitHub. Pass it to this service through a private/signed URL.

## Run

```bash
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

Configure the Next.js app with:

- `SOOLENAI_VOICE_PROVIDER=open_source`
- `SOOLENAI_TTS_URL=https://YOUR-VOICE-SERVICE/tts`
- `SOOLENAI_TTS_TOKEN=...` (optional bearer token)
- `SOOLENAI_VOICE_SAMPLE_URL=https://PRIVATE-SIGNED-URL/soolenai-voice.wav`

## Deployment

Vercel remains the web/API layer. This Python model service is separate because the voice model is much heavier than a normal Vercel function. CPU mode is suitable for testing; GPU-backed hosting is recommended for production.