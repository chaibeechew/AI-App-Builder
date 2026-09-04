import { NextResponse } from "next/server";
import {
  handleLaneriqVoiceRequest,
  laneriqVoicePublicStatus,
} from "../../../../lib/laneriq/voice-compatibility-adapter.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { success: true, voice: laneriqVoicePublicStatus() },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-LANERIQ-Authority": "laneriq",
      },
    },
  );
}

export async function POST(request) {
  return handleLaneriqVoiceRequest(request);
}
