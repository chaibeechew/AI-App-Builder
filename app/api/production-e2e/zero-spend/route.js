import { createClient } from "../../../../lib/supabase/server.js";
import {
  PRODUCTION_E2E_ENTITLEMENT_SOURCE,
  productionE2ERequestId,
  publicProductionE2EIsolationPolicy,
} from "../../../../lib/production-e2e-isolation.js";
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
    entitlementSource: PRODUCTION_E2E_ENTITLEMENT_SOURCE,
    policy: publicProductionE2EIsolationPolicy(),
  });
}

export async function POST(request) {
  try {
    if (!sameOrigin(request)) throw new RequestBoundaryError("Same-origin request required.", 403, "ORIGIN_REQUIRED");
    const user = await authenticatedUser();
    if (!user) return privateJson({ success: false, authenticated: false, code: "AUTH_REQUIRED" }, 401);

    const body = await readBoundedJson(request, MAX_BYTES);
    const action = String(body?.action || "reserve").trim();
    const clientRequestId = String(body?.requestId || "").trim();
    if (!REQUEST_ID.test(clientRequestId)) throw new RequestBoundaryError("A stable E2E request ID is required.", 400, "INVALID_REQUEST_ID");

    const requestId = productionE2ERequestId(user.id);
    if (!requestId) throw new RequestBoundaryError("Unable to derive isolated E2E identity.", 500, "E2E_IDENTITY_UNAVAILABLE");

    if (action === "release") {
      return privateJson({
        success: true,
        released: false,
        noReservationMutationRequired: true,
        zeroSpendOnly: true,
        requestId,
      });
    }
    if (action !== "reserve") throw new RequestBoundaryError("Unsupported zero-spend action.", 400, "INVALID_ACTION");

    return privateJson({
      success: true,
      reserved: true,
      testOnly: true,
      oneProjectPerAccount: true,
      canonicalInputEnforced: true,
      zeroSpendOnly: true,
      entitlementSource: PRODUCTION_E2E_ENTITLEMENT_SOURCE,
      aiCreditsCharged: 0,
      projectCreditsCharged: 0,
      clientRequestId,
      requestId,
      policy: publicProductionE2EIsolationPolicy(),
    });
  } catch (error) {
    return boundaryResponse(error, "Unable to prepare isolated zero-spend Production E2E generation.");
  }
}
