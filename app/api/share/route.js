import crypto from "node:crypto";
import { createCreatorShare, getCurrentCreatorPrincipal } from "../../../lib/cloud/creator-operations.js";
import {
  HIGH_RISK_API_LIMITS,
  boundaryResponse,
  isUuid,
  privateJson,
  readBoundedJson,
} from "../../../lib/security/high-risk-api-boundary.js";

function principalFailure(result) {
  if (result?.code === "AUTHENTICATION_REQUIRED") return privateJson({ success: false, error: "Authentication required." }, 401);
  if (result?.code === "ACCOUNT_VERIFICATION_REQUIRED") return privateJson({ success: false, error: "Account verification is required." }, 403);
  return privateJson({ success: false, error: "Share service is temporarily unavailable." }, 503);
}

export async function POST(request) {
  try {
    const principal = await getCurrentCreatorPrincipal({ requireVerified: true });
    if (!principal.ok) return principalFailure(principal);

    const body = await readBoundedJson(request, HIGH_RISK_API_LIMITS.shareBytes);
    const appId = String(body?.appId || "").trim();
    if (!isUuid(appId)) return privateJson({ success: false, error: "A valid appId is required." }, 400);

    const token = crypto.randomBytes(24).toString("base64url");
    const result = await createCreatorShare({ projectId: appId, token });
    if (!result.ok && ["AUTHENTICATION_REQUIRED", "ACCOUNT_VERIFICATION_REQUIRED"].includes(result.code)) return principalFailure(result);
    if (!result.ok && result.code === "PROJECT_VERSION_NOT_FOUND") {
      return privateJson({ success: false, error: "App or current version not found." }, 404);
    }
    if (!result.ok) return privateJson({ success: false, error: "Unable to create share link." }, 500);

    const origin = new URL(request.url).origin;
    return privateJson({ success: true, share: result.share, url: `${origin}/share/${token}` });
  } catch (error) {
    console.error("SHARE_CREATE_ERROR:", error?.name || "Error");
    return boundaryResponse(error, "Unable to create share link.");
  }
}
