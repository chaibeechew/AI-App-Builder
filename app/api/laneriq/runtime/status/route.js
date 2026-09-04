import { NextResponse } from "next/server";
import { laneriqCanonicalRuntimeStatus } from "../../../../../lib/laneriq/legacy-runtime-adapter.js";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { success: true, runtime: laneriqCanonicalRuntimeStatus() },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-LANERIQ-Authority": "laneriq",
      },
    },
  );
}
