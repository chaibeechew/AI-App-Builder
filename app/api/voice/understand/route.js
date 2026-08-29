import { NextResponse } from "next/server";
import { converse } from "../../../../engine/soolen-conversation-engine.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const transcript = String(body?.transcript || body?.text || "").slice(0, 12000);
    if (!transcript.trim()) return NextResponse.json({ error: "Voice transcript is required." }, { status: 400 });
    const result = await converse({
      message: transcript,
      history: Array.isArray(body?.history) ? body.history : [],
      currentUnderstanding: body?.currentUnderstanding || null,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("VOICE_UNDERSTAND_ERROR:", error);
    return NextResponse.json({ error: "Unable to understand the request right now." }, { status: 500 });
  }
}
