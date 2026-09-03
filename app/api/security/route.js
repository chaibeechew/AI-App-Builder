import { createServerClient } from "../../../lib/supabase/server.js";
import { securityScan } from "../../../engine/security-engine.js";
import {
  HIGH_RISK_API_LIMITS,
  boundaryResponse,
  isVerifiedUser,
  privateJson,
  readBoundedJson,
} from "../../../lib/security/high-risk-api-boundary.js";

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return privateJson({ safe: false, error: "Authentication required." }, 401);
    }
    if (!isVerifiedUser(user)) {
      return privateJson({ safe: false, error: "Account verification is required." }, 403);
    }

    const body = await readBoundedJson(request, HIGH_RISK_API_LIMITS.securityScanBytes);
    const text = String(body?.text || "").trim();
    if (!text) return privateJson({ safe: false, error: "Text is required for security scanning." }, 400);
    if (text.length > HIGH_RISK_API_LIMITS.securityScanTextChars) {
      return privateJson({ safe: false, error: "Security scan input is too long." }, 413);
    }

    return privateJson(securityScan(text));
  } catch (error) {
    console.error("SECURITY_SCAN_ERROR:", error?.name || "Error");
    return boundaryResponse(error, "Security scan failed.");
  }
}
