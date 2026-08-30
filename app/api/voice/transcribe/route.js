import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { getSoolenSubscription, requirePaidTier } from "../../../../lib/soolen/user-tier.js";
import { getSoolenCostMode } from "../../../../lib/soolen/cost-policy.js";
import { assertRuntimeUrlAllowed } from "../../../../lib/soolen/security-policy.js";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function audioFile(bytes, mimeType) {
  const extension = mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a" : mimeType.includes("wav") ? "wav" : mimeType.includes("mpeg") ? "mp3" : mimeType.includes("ogg") ? "ogg" : "webm";
  return { blob:new Blob([bytes], { type:mimeType }), name:`voice.${extension}` };
}

async function transcribeLocally({ bytes, mimeType, language }) {
  const endpoint = assertRuntimeUrlAllowed(process.env.SOOLEN_STT_URL);
  const { blob, name } = audioFile(bytes, mimeType);
  const form = new FormData();
  form.append("file", blob, name);
  if (language) form.append("language", String(language).slice(0, 40));
  const headers = {};
  if (process.env.SOOLEN_STT_TOKEN) headers.Authorization = `Bearer ${process.env.SOOLEN_STT_TOKEN}`;
  const response = await fetch(endpoint, { method:"POST", headers, body:form, cache:"no-store", redirect:"error" });
  if (!response.ok) throw new Error(`Local STT returned ${response.status}`);
  const data = await response.json();
  return String(data?.transcript || data?.text || "").trim();
}

async function transcribeWithOpenAI({ bytes, mimeType }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Cloud transcription provider is not configured.");
  const { blob, name } = audioFile(bytes, mimeType);
  const form = new FormData();
  form.append("file", blob, name);
  form.append("model", process.env.SPEECH_MODEL || "gpt-4o-mini-transcribe");
  form.append("response_format", "json");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method:"POST", headers:{ Authorization:`Bearer ${apiKey}` }, body:form,
  });
  if (!response.ok) throw new Error(`Cloud STT returned ${response.status}`);
  const data = await response.json();
  return String(data?.text || "").trim();
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error:"Authentication required." }, { status:401 });

    const subscription = await getSoolenSubscription(supabase, user.id);
    if (!requirePaidTier(subscription)) {
      return NextResponse.json({ error:"Long-recording transcription requires an active paid plan.", code:"UPGRADE_REQUIRED" }, { status:402 });
    }

    const body = await request.json();
    const audioBase64 = String(body?.audioBase64 || "").replace(/^data:[^;]+;base64,/, "");
    const mimeType = String(body?.mimeType || "audio/webm").toLowerCase();
    if (!audioBase64) return NextResponse.json({ error:"Voice audio is required." }, { status:400 });
    if (!/^audio\/(webm|mp4|m4a|wav|mpeg|ogg)/.test(mimeType)) return NextResponse.json({ error:"Unsupported audio format." }, { status:400 });
    if (audioBase64.length > Math.ceil(MAX_AUDIO_BYTES * 4 / 3) + 16) return NextResponse.json({ error:"Audio file is too large." }, { status:413 });
    const bytes = Buffer.from(audioBase64, "base64");
    if (bytes.length > MAX_AUDIO_BYTES) return NextResponse.json({ error:"Audio file is too large." }, { status:413 });

    const zeroCost = getSoolenCostMode() === "zero";
    if (zeroCost && !process.env.SOOLEN_STT_URL) {
      return NextResponse.json({ error:"Connect a local Soolen STT worker to use long transcription in zero-cost mode.", code:"LOCAL_STT_SETUP_REQUIRED" }, { status:503 });
    }

    let transcript, provider;
    if (process.env.SOOLEN_STT_URL) {
      transcript = await transcribeLocally({ bytes, mimeType, language:body?.language });
      provider = "soolen-local-stt";
    } else {
      transcript = await transcribeWithOpenAI({ bytes, mimeType });
      provider = "openai";
    }

    return NextResponse.json({ transcript, provider, tier:subscription.tier, costMode:zeroCost ? "zero" : "paid" }, { headers:{ "Cache-Control":"private, no-store" } });
  } catch (error) {
    console.error("VOICE_TRANSCRIBE_ERROR:", error?.message || error);
    return NextResponse.json({ error:"Unable to transcribe voice input." }, { status:502 });
  }
}
