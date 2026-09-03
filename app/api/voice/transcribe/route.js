import { NextResponse } from "next/server";
import { createServerClient } from "../../../../lib/supabase/server.js";
import { getSoolenCostMode } from "../../../../lib/soolen/cost-policy.js";
import { getSoolenSubscription, requirePaidTier } from "../../../../lib/soolen/user-tier.js";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_BASE64_CHARS = Math.ceil(MAX_AUDIO_BYTES / 3) * 4 + 8;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/ogg",
]);

function reply(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}

function normalizeAudioBase64(value) {
  const raw = String(value || "").trim();
  const normalized = raw.replace(/^data:audio\/[a-z0-9.+-]+;base64,/i, "").replace(/\s+/g, "");
  if (!normalized || normalized.length > MAX_BASE64_CHARS || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new Error("VOICE_AUDIO_INVALID");
  }
  const bytes = Buffer.from(normalized, "base64");
  if (!bytes.length || bytes.length > MAX_AUDIO_BYTES) throw new Error("VOICE_AUDIO_INVALID");
  return bytes;
}

function extensionFor(mimeType) {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

async function providerRequest(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function transcribeWithSoolen(bytes, mimeType) {
  const endpoint = String(process.env.SOOLEN_STT_URL || "").trim();
  if (!endpoint) return null;
  let target;
  try { target = new URL(endpoint); } catch { throw new Error("VOICE_STT_CONFIGURATION_INVALID"); }
  if (target.protocol !== "https:") throw new Error("VOICE_STT_CONFIGURATION_INVALID");

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType }), `voice.${extensionFor(mimeType)}`);
  form.append("response_format", "json");
  const headers = {};
  const token = String(process.env.SOOLEN_STT_TOKEN || "").trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await providerRequest(target.toString(), { method: "POST", headers, body: form });
  if (!response.ok) throw new Error("VOICE_STT_PROVIDER_FAILED");
  const data = await response.json().catch(() => ({}));
  const transcript = String(data?.text || data?.transcript || "").trim();
  if (!transcript) throw new Error("VOICE_STT_PROVIDER_EMPTY");
  return transcript;
}

async function transcribeWithOpenAI(bytes, mimeType) {
  const mode = getSoolenCostMode();
  if (mode !== "paid" && mode !== "balanced") throw new Error("VOICE_METERED_PROVIDER_BLOCKED");
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return null;

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mimeType }), `voice.${extensionFor(mimeType)}`);
  form.append("model", process.env.SPEECH_MODEL || "gpt-4o-mini-transcribe");
  form.append("response_format", "json");
  const response = await providerRequest("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) throw new Error("VOICE_STT_PROVIDER_FAILED");
  const data = await response.json().catch(() => ({}));
  const transcript = String(data?.text || "").trim();
  if (!transcript) throw new Error("VOICE_STT_PROVIDER_EMPTY");
  return transcript;
}

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return reply({ error: "Authentication required." }, 401);

    const subscription = await getSoolenSubscription(supabase, user.id);
    if (!requirePaidTier(subscription)) return reply({ error: "Professional access is required for cloud transcription." }, 403);

    const body = await request.json();
    const mimeType = String(body?.mimeType || "audio/webm").trim().toLowerCase();
    if (!ALLOWED_AUDIO_TYPES.has(mimeType)) return reply({ error: "Unsupported voice audio type." }, 415);

    let bytes;
    try { bytes = normalizeAudioBase64(body?.audioBase64); }
    catch { return reply({ error: "Voice audio is invalid or too large." }, 413); }

    let transcript = await transcribeWithSoolen(bytes, mimeType);
    if (!transcript) transcript = await transcribeWithOpenAI(bytes, mimeType);
    if (!transcript) return reply({ error: "Cloud transcription is not configured for the current cost policy." }, 503);

    return reply({ transcript });
  } catch (error) {
    const code = String(error?.message || "");
    if (code === "VOICE_METERED_PROVIDER_BLOCKED") return reply({ error: "Metered transcription is disabled by the current cost policy." }, 503);
    if (code === "VOICE_STT_CONFIGURATION_INVALID") return reply({ error: "Voice transcription service configuration is invalid." }, 503);
    console.error("VOICE_TRANSCRIBE_ERROR:", error?.code || error?.name || "unknown");
    return reply({ error: "Unable to transcribe voice input." }, 502);
  }
}
