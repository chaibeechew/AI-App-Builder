import { NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase/server.js";
import { getSoolenCostMode } from "../../../../lib/soolen/cost-policy.js";
import { getSoolenSubscription, requirePaidTier } from "../../../../lib/soolen/user-tier.js";
import { getSoolenAIVoiceId, getSoolenAIVoiceProvider, SOOLENAI_VOICE } from "../../../../config/soolenai-voice.js";

export const runtime = "nodejs";

const MAX_VOICE_BYTES = 16 * 1024 * 1024;

function json(payload, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
}

async function providerFetch(url, options, timeoutMs = 45_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function boundedAudio(response, fallbackType) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_VOICE_BYTES) throw new Error("SOOLENAI_VOICE_OUTPUT_TOO_LARGE");
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_VOICE_BYTES) throw new Error("SOOLENAI_VOICE_OUTPUT_TOO_LARGE");
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") || fallbackType,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function synthesizeWithOpenSource({ text, language }) {
  const endpoint = String(process.env[SOOLENAI_VOICE.openSourceEndpointEnv] || "").trim();
  const sampleUrl = String(process.env[SOOLENAI_VOICE.openSourceSampleUrlEnv] || "").trim();
  if (!endpoint || !sampleUrl) return json({ error: "SoolenAI voice service is not configured." }, 503);

  let target;
  try { target = new URL(endpoint); } catch { return json({ error: "SoolenAI voice service configuration is invalid." }, 503); }
  if (target.protocol !== "https:") return json({ error: "SoolenAI voice service configuration is invalid." }, 503);

  const token = String(process.env[SOOLENAI_VOICE.openSourceTokenEnv] || "").trim();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await providerFetch(target.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      text,
      language,
      voice: "soolenai",
      voice_sample_url: sampleUrl,
      voice_sample: SOOLENAI_VOICE.sample.fileName,
    }),
  }, 120_000);

  if (!response.ok) throw new Error("SOOLENAI_VOICE_PROVIDER_FAILED");
  return boundedAudio(response, "audio/wav");
}

async function synthesizeWithPaidProvider({ text, language }) {
  const mode = getSoolenCostMode();
  if (mode !== "paid" && mode !== "balanced") return json({ error: "Metered voice generation is disabled by the current cost policy." }, 503);

  const apiKey = String(process.env[SOOLENAI_VOICE.paidProviderApiKeyEnv] || "").trim();
  if (!apiKey) return json({ error: "SoolenAI voice service is not configured." }, 503);
  const voiceId = getSoolenAIVoiceId();
  const response = await providerFetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", apply_language_text_normalization: language === "ja" }),
  });
  if (!response.ok) throw new Error("SOOLENAI_VOICE_PROVIDER_FAILED");
  return boundedAudio(response, "audio/mpeg");
}

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Authentication required." }, 401);

    const subscription = await getSoolenSubscription(supabase, user.id);
    if (!requirePaidTier(subscription)) return json({ error: "Professional access is required for neural voice generation." }, 403);

    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const language = typeof body?.language === "string" ? body.language : "en";
    if (!text) return json({ error: "Text is required." }, 400);
    if (text.length > 5000) return json({ error: "Text is too long for one voice request." }, 413);
    if (!SOOLENAI_VOICE.languages.includes(language)) return json({ error: "Unsupported SoolenAI language." }, 400);

    const provider = getSoolenAIVoiceProvider();
    if (provider === "open_source" || provider === "local") return synthesizeWithOpenSource({ text, language });
    if (provider === SOOLENAI_VOICE.paidProvider) return synthesizeWithPaidProvider({ text, language });
    return json({ error: "SoolenAI voice service configuration is unsupported." }, 503);
  } catch (error) {
    console.error("SOOLENAI_VOICE_API_ERROR:", error?.code || error?.name || "unknown");
    return json({ error: "Unable to generate SoolenAI voice." }, 502);
  }
}
