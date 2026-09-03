import { NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase/server.js";
import { getSoolenCostMode } from "../../../../../lib/soolen/cost-policy.js";

export const runtime = "nodejs";

const MAX_SAMPLE_BYTES = 10 * 1024 * 1024;
const ALLOWED_SAMPLE_TYPES = new Set(["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/webm", "audio/ogg"]);

function json(payload, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
}

function paidCloneEnabled() {
  const mode = getSoolenCostMode();
  return (mode === "paid" || mode === "balanced") && String(process.env.SOOLENAI_VOICE_CLONE_ENABLED || "").trim().toLowerCase() === "true";
}

async function providerFetch(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return json({ error: "Authentication required." }, 401);

    const role = String(user.app_metadata?.role || "").trim().toLowerCase();
    if (role !== "admin") return json({ error: "Admin permission required." }, 403);

    if (!paidCloneEnabled()) return json({ error: "Paid voice cloning is disabled by operator policy." }, 503);

    const apiKey = String(process.env.ELEVENLABS_API_KEY || "").trim();
    if (!apiKey) return json({ error: "Voice clone provider is not configured." }, 503);

    const incoming = await request.formData();
    const audio = incoming.get("audio");
    if (!audio || typeof audio.arrayBuffer !== "function") return json({ error: "Upload the approved SoolenAI voice sample as audio." }, 400);

    const mimeType = String(audio.type || "").trim().toLowerCase();
    if (!ALLOWED_SAMPLE_TYPES.has(mimeType)) return json({ error: "Unsupported voice sample type." }, 415);
    if (!Number.isFinite(audio.size) || audio.size <= 0 || audio.size > MAX_SAMPLE_BYTES) return json({ error: "Voice sample is invalid or too large." }, 413);

    const bytes = await audio.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_SAMPLE_BYTES) return json({ error: "Voice sample is invalid or too large." }, 413);
    const sample = new Blob([bytes], { type: mimeType });

    const form = new FormData();
    form.append("name", "SoolenAI - Approved Female Voice");
    form.append("description", "SoolenAI multilingual voice created from the consented approved voice sample.");
    form.append("files[]", sample, String(audio.name || "SoolenAI_Voice_Sample.wav").slice(0, 120));
    form.append("remove_background_noise", "false");

    const response = await providerFetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.voice_id) throw new Error("SOOLENAI_VOICE_CLONE_PROVIDER_FAILED");

    return json({
      voiceId: String(data.voice_id).slice(0, 200),
      requiresVerification: Boolean(data.requires_verification),
      nextStep: "Store the approved voice ID in the protected Production voice configuration.",
    });
  } catch (error) {
    console.error("SOOLENAI_VOICE_CLONE_API_ERROR:", error?.code || error?.name || "unknown");
    return json({ error: "Unable to create SoolenAI voice clone." }, 502);
  }
}
