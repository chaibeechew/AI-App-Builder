import { createClient } from "../../../lib/supabase/server.js";
import {
  HIGH_RISK_API_LIMITS,
  boundaryResponse,
  isUuid,
  isVerifiedUser,
  privateJson,
  readBoundedJson,
} from "../../../lib/security/high-risk-api-boundary.js";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return privateJson({ success: false, error: "Authentication required." }, 401);
    if (!isVerifiedUser(user)) return privateJson({ success: false, error: "Account verification is required." }, 403);

    const body = await readBoundedJson(request, HIGH_RISK_API_LIMITS.demoBytes);
    const appId = String(body?.appId || "").trim();
    const versionId = String(body?.versionId || "").trim();
    if (!isUuid(appId) || !isUuid(versionId)) {
      return privateJson({ success: false, error: "Valid appId and versionId are required." }, 400);
    }

    const { data, error } = await supabase.rpc("create_app_demo", {
      p_app_id: appId,
      p_version_id: versionId,
      p_hours: 72,
    });
    if (error) {
      console.error("DEMO_RPC_ERROR:", error?.code || "RPC_ERROR");
      return privateJson({ success: false, error: "Unable to create demo." }, 400);
    }

    return privateJson({
      success: true,
      demo: data,
      capabilities: { preview: true, testData: true, storePublish: false, payments: false },
    });
  } catch (error) {
    console.error("DEMO_API_ERROR:", error?.name || "Error");
    return boundaryResponse(error, "Unable to create demo.");
  }
}
