import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { resolveLaneriqAdminRequest } from "../../../../lib/auth/admin-authority.js";

export const dynamic = "force-dynamic";

const CONTRACT = "csvc1";
const OPERATE_PATH = "/api/cloud/v1/operate";
const VERCEL_REQUEST_CONTEXT = Symbol.for("@vercel/request-context");
const EXACT_SHA = /^[a-f0-9]{40}$/i;

function remoteBaseUrl() {
  try {
    const url = new URL(String(process.env.LANERIQ_CLOUD_SERVICE_URL || "").trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function serviceSecret() {
  const value = String(process.env.LANERIQ_CLOUD_SERVICE_SECRET || "");
  return value.length >= 32 ? value : "";
}

function runtimeOidcIdentity() {
  const context = globalThis[VERCEL_REQUEST_CONTEXT]?.get?.() || {};
  const requestToken = String(context?.headers?.["x-vercel-oidc-token"] || "").trim();
  if (requestToken.length >= 100 && requestToken.length <= 16_384) {
    return Object.freeze({ token: requestToken, source: "REQUEST_CONTEXT" });
  }
  const environmentToken = String(process.env.VERCEL_OIDC_TOKEN || "").trim();
  if (environmentToken.length >= 100 && environmentToken.length <= 16_384) {
    return Object.freeze({ token: environmentToken, source: "ENVIRONMENT_FALLBACK" });
  }
  return Object.freeze({ token: "", source: "NOT_AVAILABLE" });
}

function productionRuntime() {
  return String(process.env.VERCEL_ENV || "").toLowerCase() === "production";
}

function releaseIdentity() {
  const sha = String(process.env.VERCEL_GIT_COMMIT_SHA || "").trim();
  return Object.freeze({
    sha: EXACT_SHA.test(sha) ? sha.toLowerCase() : "",
    environment: String(process.env.VERCEL_ENV || "").trim().toLowerCase() || "unknown",
    projectId: String(process.env.VERCEL_PROJECT_ID || "").trim() || null,
  });
}

function safeSha(value) {
  const sha = String(value || "").trim();
  return EXACT_SHA.test(sha) ? sha.toLowerCase() : "";
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function signature({ body, timestamp, nonce, secret }) {
  const canonical = `${CONTRACT}\n${timestamp}\n${nonce}\n${OPERATE_PATH}\n${sha256Hex(body)}`;
  return crypto.createHmac("sha256", secret).update(canonical).digest("hex");
}

function response(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private, max-age=0",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function authorizationError(access) {
  return {
    success: false,
    live: false,
    service: "laneriq-cloud-data",
    contract: CONTRACT,
    evidenceLevel: "CANARY_AUTHORIZATION_REQUIRED",
    error: access.error,
    code: access.code,
    canaryExecutionMethod: "ADMIN_POST_ONLY",
    canaryRequiresAdmin: true,
  };
}

function configurationTruth() {
  const baseUrl = remoteBaseUrl();
  const oidc = runtimeOidcIdentity();
  const secret = serviceSecret();
  const production = productionRuntime();
  const localRelease = releaseIdentity();
  const remoteConfigured = Boolean(baseUrl);
  const authenticationConfigured = production ? Boolean(oidc.token) : Boolean(oidc.token || secret);

  let evidenceLevel = "CODE_READY";
  let error = null;
  if (!remoteConfigured) {
    evidenceLevel = "NOT_CONFIGURED";
    error = "REMOTE_CLOUD_NOT_CONFIGURED";
  } else if (production && !oidc.token) {
    evidenceLevel = "OIDC_EVIDENCE_REQUIRED";
    error = "PRODUCTION_CLOUD_OIDC_REQUIRED";
  } else if (!production && !oidc.token && !secret) {
    evidenceLevel = "NOT_CONFIGURED";
    error = "REMOTE_CLOUD_NOT_CONFIGURED";
  }

  return Object.freeze({
    baseUrl,
    oidc,
    secret,
    production,
    localRelease,
    remoteConfigured,
    authenticationConfigured,
    evidenceLevel,
    error,
  });
}

function publicStatusPayload(truth) {
  return {
    success: truth.remoteConfigured && truth.authenticationConfigured,
    live: false,
    service: "laneriq-cloud-data",
    contract: CONTRACT,
    remoteConfigured: truth.remoteConfigured,
    authenticationConfigured: truth.authenticationConfigured,
    oidcTokenSource: truth.oidc.source,
    localReleaseSha: truth.localRelease.sha || null,
    localEnvironment: truth.localRelease.environment,
    exactReleaseIdentity: false,
    storageAdapterRoundTrip: false,
    canaryExecutionMethod: "ADMIN_POST_ONLY",
    canaryRequiresAdmin: true,
    runtimeCanary: null,
    evidenceLevel: truth.evidenceLevel,
    error: truth.error,
  };
}

export async function GET() {
  const truth = configurationTruth();
  return response(publicStatusPayload(truth), truth.remoteConfigured && truth.authenticationConfigured ? 200 : 503);
}

export async function POST(request) {
  const access = await resolveLaneriqAdminRequest(request);
  if (!access.ok) return response(authorizationError(access), access.status);

  const truth = configurationTruth();
  const { baseUrl, secret, oidc, production, localRelease } = truth;

  if (!baseUrl) {
    return response({
      ...publicStatusPayload(truth),
      canarySessionAuthority: access.sessionAuthority,
    }, 503);
  }

  if (production && !oidc.token) {
    return response({
      ...publicStatusPayload(truth),
      canarySessionAuthority: access.sessionAuthority,
    }, 503);
  }

  if (!production && !oidc.token && !secret) {
    return response({
      ...publicStatusPayload(truth),
      canarySessionAuthority: access.sessionAuthority,
    }, 503);
  }

  if (request?.nextUrl?.host && baseUrl.host === request.nextUrl.host) {
    return response({
      success: false,
      live: false,
      service: "laneriq-cloud-data",
      contract: CONTRACT,
      evidenceLevel: "NOT_DISTINCT",
      error: "REMOTE_CLOUD_MUST_BE_DISTINCT",
      canaryExecutionMethod: "ADMIN_POST_ONLY",
      canaryRequiresAdmin: true,
      canarySessionAuthority: access.sessionAuthority,
    }, 503);
  }

  const requestId = `canary-${crypto.randomBytes(12).toString("hex")}`;
  const body = JSON.stringify({
    operation: "project.read",
    requestId,
    tenantId: "laneriq-canary",
    userId: "system-canary",
    projectId: "remote-cloud-canary",
    payload: {},
  });
  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(24).toString("base64url");
  const target = new URL(OPERATE_PATH, baseUrl);
  const expectedAuthenticationMode = oidc.token ? "VERCEL_OIDC" : "HMAC_SHA256";
  const headers = {
    "content-type": "application/json",
    "x-laneriq-cloud-contract": CONTRACT,
  };

  if (oidc.token) {
    headers.authorization = `Bearer ${oidc.token}`;
  } else {
    headers["x-laneriq-cloud-ts"] = timestamp;
    headers["x-laneriq-cloud-nonce"] = nonce;
    headers["x-laneriq-cloud-signature"] = signature({ body, timestamp, nonce, secret });
  }

  let upstream;
  try {
    upstream = await fetch(target, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return response({
      success: false,
      live: false,
      service: "laneriq-cloud-data",
      contract: CONTRACT,
      evidenceLevel: "UNREACHABLE",
      error: "REMOTE_CLOUD_UNREACHABLE",
      expectedAuthenticationMode,
      oidcTokenSource: oidc.source,
      localReleaseSha: localRelease.sha || null,
      localEnvironment: localRelease.environment,
      canaryExecutionMethod: "ADMIN_POST_ONLY",
      canaryRequiresAdmin: true,
      canarySessionAuthority: access.sessionAuthority,
    }, 503);
  }

  const data = await upstream.json().catch(() => ({}));
  const authenticationVerified = data?.requestAuthenticationMode === expectedAuthenticationMode;
  const remoteReleaseSha = safeSha(data?.serviceReleaseSha);
  const exactReleaseIdentity = Boolean(localRelease.sha && remoteReleaseSha && localRelease.sha === remoteReleaseSha);
  const remoteProduction = data?.serviceEnvironment === "production";
  const canaryPassed = upstream.ok
    && data?.ok === true
    && data?.service === "laneriq-cloud-data"
    && data?.contract === CONTRACT
    && data?.requestId === requestId
    && authenticationVerified;
  const live = canaryPassed
    && production
    && remoteProduction
    && expectedAuthenticationMode === "VERCEL_OIDC"
    && data?.oidcIdentityVerified === true
    && data?.peerProject === "laneriq-ai"
    && data?.peerEnvironment === "production"
    && exactReleaseIdentity;

  let evidenceLevel = "UPSTREAM_FAILED";
  if (canaryPassed && !production) evidenceLevel = "PREVIEW_CANARY_ONLY";
  if (canaryPassed && production && !exactReleaseIdentity) evidenceLevel = "EXACT_SHA_EVIDENCE_REQUIRED";
  if (canaryPassed && production && expectedAuthenticationMode !== "VERCEL_OIDC") evidenceLevel = "OIDC_EVIDENCE_REQUIRED";
  if (live) evidenceLevel = "PRODUCTION_LIVE_OIDC_EXACT_SHA";

  return response({
    success: canaryPassed,
    live,
    service: "laneriq-cloud-data",
    contract: CONTRACT,
    remoteHost: baseUrl.host,
    signedRequestVerified: canaryPassed,
    storageAdapterRoundTrip: canaryPassed,
    requestAuthenticationMode: data?.requestAuthenticationMode || null,
    oidcIdentityVerified: data?.oidcIdentityVerified === true,
    peerProject: data?.peerProject || null,
    peerEnvironment: data?.peerEnvironment || null,
    oidcTokenSource: oidc.source,
    secretlessPeerAuthentication: canaryPassed && expectedAuthenticationMode === "VERCEL_OIDC",
    exactReleaseIdentity,
    localReleaseSha: localRelease.sha || null,
    remoteReleaseSha: remoteReleaseSha || null,
    localEnvironment: localRelease.environment,
    remoteEnvironment: data?.serviceEnvironment || null,
    evidenceLevel,
    upstreamStatus: upstream.status,
    error: canaryPassed ? null : String(data?.error || "REMOTE_CLOUD_CANARY_FAILED"),
    canaryExecutionMethod: "ADMIN_POST_ONLY",
    canaryRequiresAdmin: true,
    canarySessionAuthority: access.sessionAuthority,
  }, canaryPassed ? 200 : 502);
}
