import { createServerClient } from "../supabase/server.js";
import { getSoolenCostMode } from "../soolen/cost-policy.js";
import { getSoolenSubscription, requirePaidTier } from "../soolen/user-tier.js";
import { getSoolenAIVoiceId, getSoolenAIVoiceProvider, SOOLENAI_VOICE } from "../../config/soolenai-voice.js";

export const LANERIQ_VOICE_ADAPTER_VERSION = "1.0.0";
export const LANERIQ_VOICE_MAX_BYTES = 16 * 1024 * 1024;
export const LANERIQ_VOICE_MAX_TEXT = 5000;

function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-LANERIQ-Authority": "laneriq",
    },
  });
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
  if (declared > LANERIQ_VOICE_MAX_BYTES) throw new Error("LANERIQ_VOICE_OUTPUT_TOO_LARGE");
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > LANERIQ_VOICE_MAX_BYTES) throw new Error("LANERIQ_VOICE_OUTPUT_TOO_LARGE");
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") || fallbackType,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-LANERIQ-Authority": "laneriq",
    },
  });
}

function legacyVoiceConfig() {
  return {
    provider: getSoolenAIVoiceProvider(),
    paidProvider: SOOLENAI_VOICE.paidProvider,
    languages: [...SOOLENAI_VOICE.languages],
    openSourceEndpointEnv: SOOLENAI_VOICE.openSourceEndpointEnv,
    openSourceSampleUrlEnv: SOOLENAI_VOICE.openSourceSampleUrlEnv,
    openSourceTokenEnv: SOOLENAI_VOICE.openSourceTokenEnv,
    paidProviderApiKeyEnv: SOOLENAI_VOICE.paidProviderApiKeyEnv,
    sampleFileName: SOOLENAI_VOICE.sample.fileName,
  };
}

async function synthesizeOpenSource({ text, language, config }) {
  const endpoint = String(process.env[config.openSourceEndpointEnv] || "").trim();
  const sampleUrl = String(process.env[config.openSourceSampleUrlEnv] || "").trim();
  if (!endpoint || !sampleUrl) return json({ error: "LANERIQ voice service is not configured." }, 503);

  let target;
  try {
    target = new URL(endpoint);
  } catch {
    return json({ error: "LANERIQ voice service configuration is invalid." }, 503);
  }
  if (target.protocol !== "https:") return json({ error: "LANERIQ voice service configuration is invalid." }, 503);

  const token = String(process.env[config.openSourceTokenEnv] || "").trim();
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
      voice_sample: config.sampleFileName,
    }),
  }, 120_000);
  if (!response.ok) throw new Error("LANERIQ_VOICE_PROVIDER_FAILED");
  return boundedAudio(response, "audio/wav");
}

async function synthesizePaid({ text, language, config }) {
  const mode = getSoolenCostMode();
  if (mode !== "paid" && mode !== "balanced") {
    return json({ error: "Metered voice generation is disabled by the current cost policy." }, 503);
  }

  const apiKey = String(process.env[config.paidProviderApiKeyEnv] || "").trim();
  if (!apiKey) return json({ error: "LANERIQ voice service is not configured." }, 503);
  const voiceId = getSoolenAIVoiceId();
  const response = await providerFetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        apply_language_text_normalization: language === "ja",
      }),
    },
  );
  if (!response.ok) throw new Error("LANERIQ_VOICE_PROVIDER_FAILED");
  return boundedAudio(response, "audio/mpeg");
}

export function laneriqVoicePublicStatus() {
  const config = legacyVoiceConfig();
  return Object.freeze({
    service: "LANERIQ Voice",
    authority: "laneriq",
    canonicalPath: "/api/laneriq/voice",
    adapterVersion: LANERIQ_VOICE_ADAPTER_VERSION,
    providerNamesHidden: true,
    supportedLanguages: [...config.languages],
    maxTextCharacters: LANERIQ_VOICE_MAX_TEXT,
    maxOutputBytes: LANERIQ_VOICE_MAX_BYTES,
    legacyImplementationAdapter: true,
    legacyRuntimeRequiredForConsumers: false,
    providerLiveVerified: false,
    realOutputQualityVerified: false,
  });
}

export async function handleLaneriqVoiceRequest(request) {
  try {
    const provider = await createServerClient();
    const { data: { user }, error: authError } = await provider.auth.getUser();
    if (authError || !user) return json({ error: "Authentication required." }, 401);

    const subscription = await getSoolenSubscription(provider, user.id);
    if (!requirePaidTier(subscription)) {
      return json({ error: "Professional access is required for neural voice generation." }, 403);
    }

    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const language = typeof body?.language === "string" ? body.language : "en";
    const config = legacyVoiceConfig();

    if (!text) return json({ error: "Text is required." }, 400);
    if (text.length > LANERIQ_VOICE_MAX_TEXT) return json({ error: "Text is too long for one voice request." }, 413);
    if (!config.languages.includes(language)) return json({ error: "Unsupported LANERIQ voice language." }, 400);

    if (config.provider === "open_source" || config.provider === "local") {
      return synthesizeOpenSource({ text, language, config });
    }
    if (config.provider === config.paidProvider) return synthesizePaid({ text, language, config });
    return json({ error: "LANERIQ voice service configuration is unsupported." }, 503);
  } catch (error) {
    console.error("LANERIQ_VOICE_API_ERROR:", error?.code || error?.name || "unknown");
    return json({ error: "Unable to generate LANERIQ voice." }, 502);
  }
}
