import { NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase/server.js";
import { getSoolenAIVoiceId, SOOLENAI_VOICE } from "../../../../config/soolenai-voice.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const language = typeof body?.language === "string" ? body.language : "en";

    if (!text) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: "Text is too long for one voice request." }, { status: 400 });
    }

    const allowedLanguages = new Set(SOOLENAI_VOICE.languages);
    if (!allowedLanguages.has(language)) {
      return NextResponse.json({ error: "Unsupported SoolenAI language." }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ELEVENLABS_API_KEY is not configured." }, { status: 503 });
    }

    const voiceId = getSoolenAIVoiceId();
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: SOOLENAI_VOICE.model,
          apply_language_text_normalization: language === "ja",
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("SOOLENAI_VOICE_PROVIDER_ERROR:", response.status, detail);
      return NextResponse.json(
        { error: "SoolenAI voice provider failed." },
        { status: 502 },
      );
    }

    const audio = await response.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("SOOLENAI_VOICE_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to generate SoolenAI voice." }, { status: 500 });
  }
}
