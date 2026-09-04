import crypto from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CONTRACT = "csvc1";
const OPERATE_PATH = "/api/cloud/v1/operate";

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
  if (!baseUrl || !secret) {
    return response({
      success: false,
      live: false,
      service: "laneriq-cloud-data",
      evidenceLevel: "NOT_CONFIGURED",
      error: "REMOTE_CLOUD_NOT_CONFIGURED",
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
  const signed = signature({ body, timestamp, nonce, secret });
  const target = new URL(OPERATE_PATH, baseUrl);

  let upstream;
  try {
    upstream = await fetch(target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-laneriq-cloud-contract": CONTRACT,
        "x-laneriq-cloud-ts": timestamp,
        "x-laneriq-cloud-nonce": nonce,
        "x-laneriq-cloud-signature": signed,
      },
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
    }, 503);
  }

  const data = await upstream.json().catch(() => ({}));
  const live = upstream.ok && data?.ok === true && data?.service === "laneriq-cloud-data" && data?.contract === CONTRACT && data?.requestId === requestId;

  return response({
    success: live,
    live,
    service: "laneriq-cloud-data",
    contract: CONTRACT,
    remoteHost: baseUrl.host,
    signedRequestVerified: live,
    storageAdapterRoundTrip: live,
    evidenceLevel: live ? "LIVE_CANARY" : "UPSTREAM_FAILED",
    upstreamStatus: upstream.status,
    error: live ? null : String(data?.error || "REMOTE_CLOUD_CANARY_FAILED"),
  }, live ? 200 : 502);
}
