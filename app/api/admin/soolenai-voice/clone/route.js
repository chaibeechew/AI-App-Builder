import { NextResponse } from "next/server";
import { createServerClient } from "../../../../../lib/supabase/server.js";

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

    const role = user.app_metadata?.role || user.user_metadata?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin permission required." }, { status: 403 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ELEVENLABS_API_KEY is not configured." }, { status: 503 });
    }

    const incoming = await request.formData();
    const audio = incoming.get("audio");

    if (!audio || typeof audio.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Upload the approved SoolenAI voice sample as audio." }, { status: 400 });
    }

    const bytes = await audio.arrayBuffer();
    const sample = new Blob([bytes], { type: audio.type || "audio/wav" });

    const form = new FormData();
    form.append("name", "SoolenAI - Approved Female Voice");
    form.append("description", "SoolenAI multilingual voice created from the consented approved voice sample.");
    form.append("files[]", sample, audio.name || "SoolenAI_Voice_Sample_7.5-13.5.wav");
    form.append("remove_background_noise", "false");

    const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data?.voice_id) {
      console.error("SOOLENAI_VOICE_CLONE_ERROR:", response.status, data);
      return NextResponse.json(
        { error: "Voice clone creation failed." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      voiceId: data.voice_id,
      requiresVerification: Boolean(data.requires_verification),
      nextStep: "Save this voice ID as SOOLENAI_VOICE_ID in Vercel production environment variables.",
    });
  } catch (error) {
    console.error("SOOLENAI_VOICE_CLONE_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to create SoolenAI voice clone." }, { status: 500 });
  }
}
