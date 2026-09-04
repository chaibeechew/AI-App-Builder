import {
  CLOUD_MAX_UPSTREAM_RESPONSE_BYTES,
  CLOUD_SECURITY_LEVEL,
  CLOUD_SECURITY_PROFILE,
  enforceCloudBurstLimit,
  validateAdapterUrl,
  validateCloudPayload,
  validateCloudRequestEnvelope,
  verifySignedCloudRequest,
} from "../lib/security.js";

function secureHeaders(res) {
  res.setHeader("Cache-Control", "no-store, private, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=()");
  res.setHeader("X-LANERIQ-Cloud-Security-Level", String(CLOUD_SECURITY_LEVEL));
}

function json(res, status, body, extraHeaders = {}) {
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  secureHeaders(res);
  if (req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" }, { Allow: "POST" });

  const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  const envelope = validateCloudRequestEnvelope(req, raw);
  if (!envelope.ok) return json(res, envelope.status, { error: envelope.error });

  const signed = verifySignedCloudRequest(req, raw);
  if (!signed.ok) return json(res, signed.status, { error: signed.error });

  let input;
  try {
    input = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return json(res, 400, { error: "INVALID_JSON" });
  }

  const checked = validateCloudPayload(input);
  if (!checked.ok) return json(res, 400, { error: checked.error });

  const burst = enforceCloudBurstLimit(checked.value);
  if (!burst.ok) return json(res, burst.status, { error: burst.error }, { "Retry-After": String(burst.retryAfter) });

  const adapter = validateAdapterUrl(process.env.LANERIQ_CLOUD_STORAGE_ADAPTER_URL);
  const adapterSecret=String(process.env.LANERIQ_CLOUD_STORAGE_ADAPTER_SECRET||process.env.LANERIQ_CLOUD_SERVICE_SECRET||"");
  if (!adapter || adapterSecret.length < 32) return json(res, 503, { error: "CLOUD_STORAGE_ADAPTER_NOT_READY", evidenceLevel: "CODE_READY" });

  let response;
  try {
    response = await fetch(adapter, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization":`Bearer ${adapterSecret}`,
        "x-laneriq-cloud-contract": "csvc1",
        "x-laneriq-cloud-request-id": checked.value.requestId,
        "x-laneriq-cloud-security-level": String(CLOUD_SECURITY_LEVEL),
      },
      body: JSON.stringify(checked.value),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return json(res, 503, { error: "CLOUD_STORAGE_ADAPTER_UNREACHABLE" });
  }

  const rawUpstream = await response.text().catch(() => "");
  if (Buffer.byteLength(rawUpstream, "utf8") > CLOUD_MAX_UPSTREAM_RESPONSE_BYTES) {
    return json(res, 502, { error: "CLOUD_STORAGE_ADAPTER_RESPONSE_TOO_LARGE" });
  }

  let data = {};
  if (rawUpstream) {
    try {
      data = JSON.parse(rawUpstream);
    } catch {
      return json(res, 502, { error: "CLOUD_STORAGE_ADAPTER_INVALID_RESPONSE" });
    }
  }

  if (!response.ok) {
    const status = response.status >= 400 && response.status < 600 ? response.status : 502;
    return json(res, status, { error: String(data?.error || "CLOUD_STORAGE_ADAPTER_FAILED").slice(0, 120) });
  }

  return json(res, 200, {
    ...data,
    service: "laneriq-cloud-data",
    contract: "csvc1",
    requestId: checked.value.requestId,
    securityLevel: CLOUD_SECURITY_LEVEL,
    securityProfile: CLOUD_SECURITY_PROFILE,
  });
}
