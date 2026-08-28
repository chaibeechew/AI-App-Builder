import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const audioBase64 = String(body?.audioBase64 || "");
    const mimeType = String(body?.mimeType || "audio/webm");
    if (!audioBase64) return NextResponse.json({ error: "Voice audio is required." }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Voice provider is not configured yet." }, { status: 503 });

    const bytes = Buffer.from(audioBase64, "base64");
    const extension = mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a" : mimeType.includes("wav") ? "wav" : "webm";
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
      const detail = await response.text().catch(() => "");
      return NextResponse.json({ error: `Voice transcription failed (${response.status}).`, detail: detail.slice(0, 500) }, { status: 502 });
    }
    const data = await response.json();
    return NextResponse.json({ transcript: String(data?.text || "").trim() });
  } catch (error) {
    console.error("VOICE_TRANSCRIBE_ERROR:", error);
    return NextResponse.json({ error: "Unable to transcribe voice input." }, { status: 500 });
  }
}
