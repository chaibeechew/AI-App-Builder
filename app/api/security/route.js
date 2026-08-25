import { NextResponse } from "next/server";
import { securityScan } from "../../../engine/security-engine.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const text = body?.text || "";

    const result = securityScan(text);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        safe: false,
        error: "Security scan failed.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
