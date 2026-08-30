import { NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase/server.js";
import { getSoolenAIVoiceId, getSoolenAIVoiceProvider, SOOLENAI_VOICE } from "../../../../config/soolenai-voice.js";
import { getSoolenSubscription, requirePaidTier } from "../../../../lib/soolen/user-tier.js";
import { getSoolenCostMode } from "../../../../lib/soolen/cost-policy.js";

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
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", apply_language_text_normalization: language.startsWith("ja") }),
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
    const openSourceReady = Boolean(process.env[SOOLENAI_VOICE.openSourceEndpointEnv] && process.env[SOOLENAI_VOICE.openSourceSampleUrlEnv]);
    const paidReady = Boolean(process.env[SOOLENAI_VOICE.paidProviderApiKeyEnv] && process.env[SOOLENAI_VOICE.voiceIdEnv]);
    const subscription = await getSoolenSubscription(supabase, user.id);
    if (!requirePaidTier(subscription)) return NextResponse.json({ error: "Soolen neural voice requires an active paid plan. Device voice remains available at no cost.", code: "UPGRADE_REQUIRED" }, { status: 402 });

    if (getSoolenCostMode() === "zero") {
      if (openSourceReady) return synthesizeWithOpenSource({ text, language });
      return NextResponse.json({ error: "Connect the open-source Soolen TTS worker to use neural voice in zero-cost mode.", code: "LOCAL_TTS_SETUP_REQUIRED" }, { status: 503 });
    }
    if ((provider === "open_source" || provider === "local") && openSourceReady) return synthesizeWithOpenSource({ text, language });
    if (provider === "elevenlabs" || (!openSourceReady && paidReady)) return synthesizeWithElevenLabs({ text, language });
    if (openSourceReady) return synthesizeWithOpenSource({ text, language });
    return NextResponse.json({ error: "No SoolenAI voice provider is configured.", code: "PROVIDER_SETUP_REQUIRED" }, { status: 503 });
  } catch (error) {
    console.error("SOOLENAI_VOICE_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to generate SoolenAI voice." }, { status: 500 });
  }
}
