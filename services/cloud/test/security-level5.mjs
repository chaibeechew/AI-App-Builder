import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  CLOUD_CONTRACT,
  CLOUD_MAX_REQUEST_BYTES,
  CLOUD_SECURITY_LEVEL,
  CLOUD_SECURITY_PROFILE,
  enforceCloudBurstLimit,
  validateAdapterUrl,
  validateCloudPayload,
  validateCloudRequestEnvelope,
  verifySignedCloudRequest,
} from "../lib/security.js";

process.env.LANERIQ_CLOUD_SERVICE_SECRET = "level5-test-secret-0123456789abcdef0123456789abcdef";

function sign(body, ts, nonce) {
  const digest = crypto.createHash("sha256").update(body).digest("hex");
  return crypto.createHmac("sha256", process.env.LANERIQ_CLOUD_SERVICE_SECRET)
    .update(`${CLOUD_CONTRACT}\n${ts}\n${nonce}\n/api/cloud/v1/operate\n${digest}`)
    .digest("hex");
}

function request(body, nonce = crypto.randomBytes(24).toString("base64url")) {
  const ts = String(Date.now());
  return {
    nonce,
    req: {
      headers: {
        "content-type": "application/json",
        "x-laneriq-cloud-contract": CLOUD_CONTRACT,
        "x-laneriq-cloud-ts": ts,
        "x-laneriq-cloud-nonce": nonce,
        "x-laneriq-cloud-signature": sign(body, ts, nonce),
      },
    },
  };
}

assert.equal(CLOUD_SECURITY_LEVEL, 5);
assert.equal(CLOUD_SECURITY_PROFILE, "LANERIQ-CLOUD-L5");

const body = JSON.stringify({ operation: "project.read", requestId: "req-l5", tenantId: "tenant-l5", userId: "user-l5", projectId: "project-l5", payload: {} });
const signed = request(body);
assert.equal(validateCloudRequestEnvelope(signed.req, body).ok, true);
assert.equal(verifySignedCloudRequest(signed.req, body).ok, true);
assert.equal(verifySignedCloudRequest(signed.req, body).error, "REPLAYED_NONCE", "A valid nonce must not be reusable in the same Cloud runtime.");

const wrongContract = { headers: { ...signed.req.headers, "x-laneriq-cloud-contract": "wrong" } };
assert.equal(validateCloudRequestEnvelope(wrongContract, body).error, "CONTRACT_MISMATCH");
const wrongType = { headers: { ...signed.req.headers, "content-type": "text/plain" } };
assert.equal(validateCloudRequestEnvelope(wrongType, body).error, "JSON_CONTENT_TYPE_REQUIRED");
assert.equal(validateCloudRequestEnvelope(signed.req, "x".repeat(CLOUD_MAX_REQUEST_BYTES + 1)).error, "REQUEST_TOO_LARGE");

assert.equal(validateCloudPayload({ operation: "project.write", requestId: "r", tenantId: "t", userId: "u", projectId: "p", payload: { api_key: "raw-secret" } }).error, "RAW_SECRET_FORBIDDEN");
assert.equal(validateCloudPayload({ operation: "artifact.meta", requestId: "r", tenantId: "t", userId: "u", projectId: "p", payload: { base64: "AAAA" } }).error, "BINARY_UPLOAD_FORBIDDEN");
const polluted = JSON.parse('{"__proto__":{"admin":true}}');
assert.equal(validateCloudPayload({ operation: "project.write", requestId: "r", tenantId: "t", userId: "u", projectId: "p", payload: polluted }).error, "PROTOTYPE_POLLUTION_KEY_FORBIDDEN");
assert.equal(validateCloudPayload({ operation: "project.write", requestId: "r", tenantId: "t", userId: "u", projectId: "p", payload: { query: "delete from users" } }).error, "ARBITRARY_QUERY_FORBIDDEN");

assert.equal(validateAdapterUrl("http://example.com/adapter"), "");
assert.equal(validateAdapterUrl("https://127.0.0.1/adapter"), "");
assert.equal(validateAdapterUrl("https://192.168.1.5/adapter"), "");
assert.match(validateAdapterUrl("https://example.com/adapter"), /^https:\/\/example\.com/);

for (let i = 0; i < 40; i += 1) {
  assert.equal(enforceCloudBurstLimit({ operation: "project.write", tenantId: "burst-tenant", userId: "burst-user" }).ok, true);
}
assert.equal(enforceCloudBurstLimit({ operation: "project.write", tenantId: "burst-tenant", userId: "burst-user" }).error, "CLOUD_RATE_LIMITED");

console.log("✓ LANERIQ Cloud Level 5 requires signed JSON, bounded bodies and exact contract version");
console.log("✓ Replay nonce, burst abuse, prototype pollution, raw secret, SQL-like query and binary metadata defenses are fail-closed");
console.log("✓ Storage adapter egress is HTTPS-only and blocks obvious loopback/private-network targets");
