import crypto from "node:crypto";
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

    const body = await readBoundedJson(request, HIGH_RISK_API_LIMITS.shareBytes);
    const appId = String(body?.appId || "").trim();
    if (!isUuid(appId)) return privateJson({ success: false, error: "A valid appId is required." }, 400);

    const { data: app, error: appError } = await supabase
      .from("apps")
      .select("id,name,current_version_id")
      .eq("id", appId)
      .eq("owner_id", user.id)
      .single();
    if (appError || !app?.current_version_id) {
      return privateJson({ success: false, error: "App or current version not found." }, 404);
    }

    const token = crypto.randomBytes(24).toString("base64url");
    const { data: share, error } = await supabase
      .from("app_shares")
      .insert({ app_id: app.id, version_id: app.current_version_id, token, created_by: user.id })
      .select("id,token,created_at")
      .single();
    if (error) {
      console.error("SHARE_CREATE_DB_ERROR:", error?.code || "DB_ERROR");
      return privateJson({ success: false, error: "Unable to create share link." }, 500);
    }

    const origin = new URL(request.url).origin;
    return privateJson({ success: true, share, url: `${origin}/share/${token}` });
  } catch (error) {
    console.error("SHARE_CREATE_ERROR:", error?.name || "Error");
    return boundaryResponse(error, "Unable to create share link.");
  }
}
