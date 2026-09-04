import crypto from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CONTRACT = "csvc1";
const OPERATE_PATH = "/api/cloud/v1/operate";
const VERCEL_REQUEST_CONTEXT = Symbol.for("@vercel/request-context");

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
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request) {
  const baseUrl = remoteBaseUrl();
  const secret = serviceSecret();
  const oidc = runtimeOidcIdentity();
  if (!baseUrl || (!oidc.token && !secret)) {
    return response({
      success: false,
      live: false,
      service: "laneriq-cloud-data",
      evidenceLevel: "NOT_CONFIGURED",
      error: "REMOTE_CLOUD_NOT_CONFIGURED",
      oidcTokenSource: oidc.source,
    }, 503);
  }

  if (request?.nextUrl?.host && baseUrl.host === request.nextUrl.host) {
    return response({
      success: false,
      live: false,
      service: "laneriq-cloud-data",
      evidenceLevel: "NOT_DISTINCT",
      error: "REMOTE_CLOUD_MUST_BE_DISTINCT",
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
      evidenceLevel: "UNREACHABLE",
      error: "REMOTE_CLOUD_UNREACHABLE",
      expectedAuthenticationMode,
      oidcTokenSource: oidc.source,
    }, 503);
  }

  const data = await upstream.json().catch(() => ({}));
  const authenticationVerified = data?.requestAuthenticationMode === expectedAuthenticationMode;
  const live = upstream.ok && data?.ok === true && data?.service === "laneriq-cloud-data" && data?.contract === CONTRACT && data?.requestId === requestId && authenticationVerified;

  return response({
    success: live,
    live,
    service: "laneriq-cloud-data",
    contract: CONTRACT,
    remoteHost: baseUrl.host,
    signedRequestVerified: live,
    storageAdapterRoundTrip: live,
    requestAuthenticationMode: data?.requestAuthenticationMode || null,
    oidcIdentityVerified: data?.oidcIdentityVerified === true,
    peerProject: data?.peerProject || null,
    peerEnvironment: data?.peerEnvironment || null,
    oidcTokenSource: oidc.source,
    secretlessPeerAuthentication: live && expectedAuthenticationMode === "VERCEL_OIDC",
    evidenceLevel: live ? "LIVE_CANARY" : "UPSTREAM_FAILED",
    upstreamStatus: upstream.status,
    error: live ? null : String(data?.error || "REMOTE_CLOUD_CANARY_FAILED"),
  }, live ? 200 : 502);
}
