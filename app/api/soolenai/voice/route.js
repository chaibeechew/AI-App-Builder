import { NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase/server.js";
import { getSoolenAIVoiceId, getSoolenAIVoiceProvider, SOOLENAI_VOICE } from "../../../../config/soolenai-voice.js";

export const runtime = "nodejs";

async function synthesizeWithOpenSource({ text, language }) {
  const endpoint = process.env[SOOLENAI_VOICE.openSourceEndpointEnv];
  const sampleUrl = process.env[SOOLENAI_VOICE.openSourceSampleUrlEnv];
  if (!endpoint || !sampleUrl) {
    return NextResponse.json({
      error: "SoolenAI open-source voice engine is not fully configured.",
      provider: "open_source",
      setup: `Set ${SOOLENAI_VOICE.openSourceEndpointEnv} and ${SOOLENAI_VOICE.openSourceSampleUrlEnv} on the server.`,
    }, { status: 503 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const token = process.env[SOOLENAI_VOICE.openSourceTokenEnv];
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        text,
        language,
        voice: "soolenai",
        voice_sample_url: sampleUrl,
        voice_sample: SOOLENAI_VOICE.sample.fileName,
      }),
    });

    if (!response.ok) {
      console.error("SOOLENAI_OPEN_SOURCE_PROVIDER_ERROR:", response.status, await response.text());
      return NextResponse.json({ error: "SoolenAI open-source voice provider failed." }, { status: 502 });
    }

    return new Response(await response.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function synthesizeWithElevenLabs({ text, language }) {
  const apiKey = process.env[SOOLENAI_VOICE.paidProviderApiKeyEnv];
  if (!apiKey) return NextResponse.json({ error: "ElevenLabs is not configured." }, { status: 503 });
  const voiceId = getSoolenAIVoiceId();
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", apply_language_text_normalization: language === "ja" }),
  });
  if (!response.ok) return NextResponse.json({ error: "SoolenAI paid voice provider failed." }, { status: 502 });
  return new Response(await response.arrayBuffer(), { status: 200, headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const language = typeof body?.language === "string" ? body.language : "en";
    if (!text) return NextResponse.json({ error: "Text is required." }, { status: 400 });
    if (text.length > 5000) return NextResponse.json({ error: "Text is too long for one voice request." }, { status: 400 });
    if (!SOOLENAI_VOICE.languages.includes(language)) return NextResponse.json({ error: "Unsupported SoolenAI language." }, { status: 400 });

    const provider = getSoolenAIVoiceProvider();
    if (provider === "open_source" || provider === "local") return synthesizeWithOpenSource({ text, language });
    if (provider === "elevenlabs") return synthesizeWithElevenLabs({ text, language });
    return NextResponse.json({ error: `Unsupported SoolenAI voice provider: ${provider}` }, { status: 400 });
  } catch (error) {
    console.error("SOOLENAI_VOICE_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to generate SoolenAI voice." }, { status: 500 });
  }
}
