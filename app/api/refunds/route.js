import { createClient } from "../../../lib/supabase/server.js";
import {
  HIGH_RISK_API_LIMITS,
  boundaryResponse,
  isUuid,
  isVerifiedUser,
  privateJson,
  readBoundedJson,
} from "../../../lib/security/high-risk-api-boundary.js";

function refundFailure(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("already requested")) return "A refund has already been requested for this subscription.";
  if (message.includes("expired")) return "This subscription is outside the refund request window.";
  if (message.includes("not found")) return "Subscription not found or unavailable.";
  if (message.includes("not eligible")) return "This subscription is not eligible for a refund.";
  return "";
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return privateJson({ success: false, error: "Authentication required." }, 401);
    if (!isVerifiedUser(user)) return privateJson({ success: false, error: "Account verification is required." }, 403);

    const body = await readBoundedJson(request, HIGH_RISK_API_LIMITS.refundBytes);
    const subscriptionId = String(body?.subscriptionId || "").trim();
    const reason = String(body?.reason || "").trim().replace(/\s+/g, " ").slice(0, HIGH_RISK_API_LIMITS.refundReasonChars);

    if (!isUuid(subscriptionId)) {
      return privateJson({ success: false, error: "A valid subscription ID is required." }, 400);
    }

    const { data, error } = await supabase.rpc("request_subscription_refund", {
      p_subscription_id: subscriptionId,
      p_reason: reason || null,
    });

    if (error) {
      const friendly = refundFailure(error);
      if (friendly) return privateJson({ success: false, error: friendly }, 400);
      console.error("REFUND_RPC_ERROR:", error?.code || "RPC_ERROR");
      return privateJson({ success: false, error: "Unable to submit refund request." }, 500);
    }

    return privateJson({ success: true, refund: data });
  } catch (error) {
    console.error("REFUND_API_ERROR:", error?.name || "Error");
    return boundaryResponse(error, "Unable to submit refund request.");
  }
}
