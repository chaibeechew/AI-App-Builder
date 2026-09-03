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

    const body = await readBoundedJson(request, HIGH_RISK_API_LIMITS.withdrawalBytes);
    const payoutAccountId = String(body?.payoutAccountId || "").trim();
    const amount = Number(body?.amount);
    const cents = Number.isFinite(amount) ? Math.round(amount * 100) : NaN;

    if (!isUuid(payoutAccountId) || !Number.isSafeInteger(cents) || cents <= 0) {
      return privateJson({ success: false, error: "Valid payout account and amount are required." }, 400);
    }
    if (Math.abs(amount * 100 - cents) > 0.000001) {
      return privateJson({ success: false, error: "Withdrawal amount may use at most two decimal places." }, 400);
    }
    if (cents > 100_000) {
      return privateJson({ success: false, error: "Maximum single withdrawal is $1,000." }, 400);
    }

    const { data, error } = await supabase.rpc("request_withdrawal", {
      p_payout_account_id: payoutAccountId,
      p_amount: (cents / 100).toFixed(2),
    });

    if (error) {
      console.error("WITHDRAWAL_RPC_ERROR:", error?.code || "RPC_ERROR");
      return privateJson({ success: false, error: "Unable to create withdrawal request." }, 400);
    }

    return privateJson({ success: true, withdrawal: data });
  } catch (error) {
    console.error("WITHDRAWAL_API_ERROR:", error?.name || "Error");
    return boundaryResponse(error, "Unable to create withdrawal request.");
  }
}
