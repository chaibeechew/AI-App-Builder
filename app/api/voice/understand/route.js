import { NextResponse } from "next/server";
import { understandVoiceIdea } from "../../../lib/voice-understanding-engine";

export async function POST(request) {
  try {
    const body = await request.json();
    const transcript = String(body?.transcript || body?.text || "").slice(0, 10000);
    if (!transcript.trim()) return NextResponse.json({ error: "Voice transcript is required." }, { status: 400 });
    return NextResponse.json(understandVoiceIdea(transcript));
  } catch (error) {
    console.error("VOICE_UNDERSTAND_ERROR:", error);
    return NextResponse.json({ error: "Unable to understand the voice request." }, { status: 500 });
  }
}
