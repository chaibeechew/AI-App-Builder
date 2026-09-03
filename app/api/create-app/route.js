import { createServerClient } from "../../../lib/supabase/server.js";
import { runAutonomousEngine } from "../../../engine/autonomous-engine.js";
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
      return privateJson({ success: false, error: "Authentication required." }, 401);
    }
    if (!isVerifiedUser(user)) {
      return privateJson({ success: false, error: "Account verification is required." }, 403);
    }

    const body = await readBoundedJson(request, HIGH_RISK_API_LIMITS.createAppBytes);
    const prompt = String(body?.prompt || body?.idea || "").trim();

    if (!prompt) {
      return privateJson({ success: false, error: "Please describe the app you want to build." }, 400);
    }
    if (prompt.length > HIGH_RISK_API_LIMITS.createAppPromptChars) {
      return privateJson({ success: false, error: "App description is too long." }, 413);
    }

    const result = await runAutonomousEngine(prompt);

    return privateJson({
      success: true,
      ...result,
      userId: user.id,
      permissions: {
        create: true,
        preview: true,
        test: true,
        securityScan: true,
        publish: false,
        humanApprovalRequired: true,
      },
      message: "App created successfully. Human approval is required before publishing.",
    });
  } catch (error) {
    console.error("CREATE_APP_ERROR:", error?.name || "Error");
    return boundaryResponse(error, "LANERIQ AI build failed.");
  }
}
