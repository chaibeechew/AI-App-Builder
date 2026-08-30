import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { getSoolenSubscription, requirePaidTier } from "../../../../lib/soolen/user-tier.js";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const subscription = await getSoolenSubscription(supabase, user.id);
    if (!requirePaidTier(subscription)) {
      return NextResponse.json({ error: "Cloud transcription requires an active paid plan.", code: "UPGRADE_REQUIRED" }, { status: 402 });
    }

    const body = await request.json();
    const audioBase64 = String(body?.audioBase64 || "").replace(/^data:[^;]+;base64,/, "");
    const mimeType = String(body?.mimeType || "audio/webm").toLowerCase();
    if (!audioBase64) return NextResponse.json({ error: "Voice audio is required." }, { status: 400 });
    if (!/^audio\/(webm|mp4|m4a|wav|mpeg|ogg)/.test(mimeType)) return NextResponse.json({ error: "Unsupported audio format." }, { status: 400 });
    if (audioBase64.length > Math.ceil(MAX_AUDIO_BYTES * 4 / 3) + 16) return NextResponse.json({ error: "Audio file is too large." }, { status: 413 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Cloud transcription provider is not configured.", code: "PROVIDER_SETUP_REQUIRED" }, { status: 503 });

    const bytes = Buffer.from(audioBase64, "base64");
    if (bytes.length > MAX_AUDIO_BYTES) return NextResponse.json({ error: "Audio file is too large." }, { status: 413 });
    const extension = mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a" : mimeType.includes("wav") ? "wav" : mimeType.includes("mpeg") ? "mp3" : mimeType.includes("ogg") ? "ogg" : "webm";
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mimeType }), `voice.${extension}`);
    form.append("model", process.env.SPEECH_MODEL || "gpt-4o-mini-transcribe");
    form.append("response_format", "json");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!response.ok) {
      console.error("VOICE_TRANSCRIBE_PROVIDER_ERROR:", response.status);
      return NextResponse.json({ error: "Cloud transcription provider failed." }, { status: 502 });
    }
    const data = await response.json();
    return NextResponse.json({ transcript: String(data?.text || "").trim(), tier: subscription.tier }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("VOICE_TRANSCRIBE_ERROR:", error);
    return NextResponse.json({ error: "Unable to transcribe voice input." }, { status: 500 });
  }
}
