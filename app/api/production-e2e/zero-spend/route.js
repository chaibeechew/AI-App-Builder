import { createClient } from "../../../../lib/supabase/server.js";
import {
  consumeZeroSpendAppBuilderEntitlement,
  restoreFailedAppBuilderCreate,
} from "../../../../lib/app-builder-finance.js";
import {
  RequestBoundaryError,
  boundaryResponse,
  privateJson,
  readBoundedJson,
} from "../../../../lib/security/high-risk-api-boundary.js";

const REQUEST_ID = /^[A-Za-z0-9._:-]{1,160}$/;
const MAX_BYTES = 4 * 1024;

function sameOrigin(request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin) return false;
    const originHost = new URL(origin).host;
    const expectedHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
    const fetchSite = String(request.headers.get("sec-fetch-site") || "").toLowerCase();
    return originHost === expectedHost && fetchSite !== "cross-site";
  } catch {
    return false;
  }
}

async function authenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.id) return null;
  return user;
}

export async function GET() {
  const user = await authenticatedUser();
  if (!user) return privateJson({ success: false, authenticated: false, code: "AUTH_REQUIRED" }, 401);
  return privateJson({
    success: true,
    authenticated: true,
    zeroSpendOnly: true,
    aiCreditsAllowed: false,
    projectCreditsAllowed: false,
    supportedEntitlementSources: ["free_first_project_create", "pro_access"],
  });
}

export async function POST(request) {
  try {
    if (!sameOrigin(request)) throw new RequestBoundaryError("Same-origin request required.", 403, "ORIGIN_REQUIRED");
    const user = await authenticatedUser();
    if (!user) return privateJson({ success: false, authenticated: false, code: "AUTH_REQUIRED" }, 401);

    const body = await readBoundedJson(request, MAX_BYTES);
    const action = String(body?.action || "reserve").trim();
    const requestId = String(body?.requestId || "").trim();
    if (!REQUEST_ID.test(requestId)) throw new RequestBoundaryError("A stable E2E request ID is required.", 400, "INVALID_REQUEST_ID");

    if (action === "release") {
      const restored = await restoreFailedAppBuilderCreate(user.id, { requestId });
      return privateJson({ success: true, released: restored?.restored === true, zeroSpendOnly: true });
    }
    if (action !== "reserve") throw new RequestBoundaryError("Unsupported zero-spend action.", 400, "INVALID_ACTION");

    const entitlement = await consumeZeroSpendAppBuilderEntitlement(user.id, { requestId });
    if (!entitlement?.allowed) {
      return privateJson({
        success: false,
        code: "ZERO_SPEND_ENTITLEMENT_REQUIRED",
        error: "Fresh Production E2E generation is unavailable without using credits on this account.",
        zeroSpendOnly: true,
        aiCreditsCharged: 0,
        projectCreditsCharged: 0,
      }, 409);
    }
    if (!["free_first_project_create", "pro_access"].includes(String(entitlement.source || ""))) {
      await restoreFailedAppBuilderCreate(user.id, { requestId }).catch(() => {});
      return privateJson({ success: false, code: "ZERO_SPEND_POLICY_VIOLATION", zeroSpendOnly: true }, 409);
    }

    return privateJson({
      success: true,
      reserved: true,
      zeroSpendOnly: true,
      entitlementSource: entitlement.source,
      aiCreditsCharged: 0,
      projectCreditsCharged: 0,
      requestId,
    });
  } catch (error) {
    return boundaryResponse(error, "Unable to prepare zero-spend Production E2E generation.");
  }
}
