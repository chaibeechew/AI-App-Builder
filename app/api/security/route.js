import { getCurrentCreatorPrincipal } from "../../../lib/cloud/creator-operations.js";
import { securityScan } from "../../../engine/security-engine.js";
import {
  HIGH_RISK_API_LIMITS,
  boundaryResponse,
  privateJson,
  readBoundedJson,
} from "../../../lib/security/high-risk-api-boundary.js";

export async function POST(request) {
  try {
    const principal = await getCurrentCreatorPrincipal({ requireVerified: true });
    if (!principal.ok && principal.code === "AUTHENTICATION_REQUIRED") {
      return privateJson({ safe: false, error: "Authentication required." }, 401);
    }
    if (!principal.ok && principal.code === "ACCOUNT_VERIFICATION_REQUIRED") {
      return privateJson({ safe: false, error: "Account verification is required." }, 403);
    }
    if (!principal.ok) return privateJson({ safe: false, error: "Security scan is temporarily unavailable." }, 503);

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
