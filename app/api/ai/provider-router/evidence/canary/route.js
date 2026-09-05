import { NextResponse } from "next/server";
import { resolveLaneriqAdminRequest } from "../../../../../../lib/auth/admin-authority.js";
import { runBoundedExternalProviderEvidenceCanary } from "../../../../../../lib/ai/provider-evidence-producer.js";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 512;
const PROVIDER_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

function responseHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "Pragma": "no-cache",
    "Vary": "Cookie",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  };
}

function json(payload, status = 200) {
  return NextResponse.json(payload, { status, headers: responseHeaders() });
}

export async function POST(request) {
  const access = await resolveLaneriqAdminRequest(request);
  if (!access.ok) {
    return json({ success: false, error: access.error, code: access.code }, access.status);
  }

  const length = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return json({ success: false, error: "Evidence canary request is too large.", code: "EVIDENCE_CANARY_REQUEST_TOO_LARGE" }, 413);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Valid JSON body required.", code: "INVALID_JSON" }, 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ success: false, error: "Evidence canary request must be an object.", code: "INVALID_EVIDENCE_CANARY_INPUT" }, 400);
  }

  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "provider") {
    return json({
      success: false,
      error: "Only a provider identifier is accepted. Prompts and user content are not permitted.",
      code: "UNSUPPORTED_EVIDENCE_CANARY_INPUT",
    }, 400);
  }

  const provider = String(body.provider || "").trim().toLowerCase();
  if (!PROVIDER_PATTERN.test(provider)) {
    return json({ success: false, error: "Valid provider identifier required.", code: "INVALID_PROVIDER" }, 400);
  }

  try {
    const result = await runBoundedExternalProviderEvidenceCanary(provider);
    return json({
      ...result,
      sessionAuthority: access.sessionAuthority,
      adminAuthorized: true,
    });
  } catch (error) {
    const status = Number(error?.status || 500);
    const safeStatus = status >= 400 && status <= 599 ? status : 500;
    const preflight = error?.details?.preflight;
    return json({
      success: false,
      code: String(error?.code || "PROVIDER_EVIDENCE_CANARY_FAILED"),
      error: safeStatus >= 500 ? "Provider evidence canary failed." : "Provider evidence canary is not permitted by current policy.",
      networkAttempted: preflight ? Boolean(preflight.networkPermitted) : safeStatus >= 500,
      costMode: preflight?.mode || null,
      signingConfigured: preflight ? Boolean(preflight.signingConfigured) : null,
      explicitlyEnabled: preflight ? Boolean(preflight.explicitlyEnabled) : null,
      explicitlyAllowlisted: preflight ? Boolean(preflight.explicitlyAllowlisted) : null,
      hardStopVerified: preflight ? Boolean(preflight.hardStopVerified) : null,
      providerConfigured: preflight ? Boolean(preflight.providerConfigured) : null,
      exactReleaseIdentity: preflight ? Boolean(preflight.production && preflight.releaseSha) : null,
    }, safeStatus);
  }
}
