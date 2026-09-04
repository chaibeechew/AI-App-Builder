import { NextResponse } from "next/server";
import { publicLaneriqPlatformStatus } from "../../../../lib/laneriq/legacy-runtime-adapter.js";

export const dynamic = "force-dynamic";

function reply(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-LANERIQ-Authority": "laneriq",
    },
  });
}

export async function GET() {
  try {
    return reply({ success: true, platform: publicLaneriqPlatformStatus() });
  } catch (error) {
    console.error("LANERIQ_PLATFORM_STATUS_ERROR:", error?.code || error?.name || "unknown");
    return reply({ success: false, error: "Platform status is temporarily unavailable." }, 503);
  }
}
