import { NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase/server.js";
import { securityScan } from "../../../engine/security-engine.js";

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ safe: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const text = String(body?.text || "");
    const result = securityScan(text);

    return NextResponse.json(result);
  } catch (error) {
    console.error("SECURITY_SCAN_ERROR:", error);
    return NextResponse.json({ safe: false, error: "Security scan failed." }, { status: 500 });
  }
}
