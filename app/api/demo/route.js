import { createCreatorDemo, getCurrentCreatorPrincipal } from "../../../lib/cloud/creator-operations.js";
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
  return privateJson({ success: false, error: "Demo service is temporarily unavailable." }, 503);
}

export async function POST(request) {
  try {
    const principal = await getCurrentCreatorPrincipal({ requireVerified: true });
    if (!principal.ok) return principalFailure(principal);

    const body = await readBoundedJson(request, HIGH_RISK_API_LIMITS.demoBytes);
    const appId = String(body?.appId || "").trim();
    const versionId = String(body?.versionId || "").trim();
    if (!isUuid(appId) || !isUuid(versionId)) {
      return privateJson({ success: false, error: "Valid appId and versionId are required." }, 400);
    }

    const result = await createCreatorDemo({ projectId: appId, versionId, hours: 72 });
    if (!result.ok && ["AUTHENTICATION_REQUIRED", "ACCOUNT_VERIFICATION_REQUIRED"].includes(result.code)) return principalFailure(result);
    if (!result.ok) return privateJson({ success: false, error: "Unable to create demo." }, 400);

    return privateJson({
      success: true,
      demo: result.demo,
      capabilities: { preview: true, testData: true, storePublish: false, payments: false },
    });
  } catch (error) {
    console.error("DEMO_API_ERROR:", error?.name || "Error");
    return boundaryResponse(error, "Unable to create demo.");
  }
}
