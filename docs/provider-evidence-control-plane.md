# LANERIQ Provider Evidence Control Plane v2

## Purpose

Provider configuration and per-instance runtime success are not canonical proof that an external AI provider is LIVE. The Provider Evidence Control Plane keeps those truth levels separate and prevents environment-variable presence, one successful request, Preview evidence, or stale evidence from being promoted to Production LIVE.

## Public truth boundary

`GET /api/ai/provider-router/status` remains read-only. It exposes aggregate evidence counts through `providerEvidence` and never exposes provider names, credentials, evidence signing secrets, prompts, or user content.

The existing executable local zero-cost canary remains `POST /api/ai/provider-router/status` and requires LANERIQ administrator authority. Provider Evidence v2 does not make that endpoint execute external providers.

## Evidence states

- `NOT_CONFIGURED`
- `LOCAL_ZERO_COST`
- `CONFIGURED_UNVERIFIED`
- `RUNTIME_OBSERVED`
- `DEGRADED`
- `QUOTA_EXHAUSTED`
- `FAILOVER_VERIFIED`
- `LIVE_VERIFIED`

Only `LIVE_VERIFIED` is canonical external-provider LIVE evidence.

## LIVE_VERIFIED requirements

A canonical receipt must simultaneously satisfy all of the following:

- contract `prve2`;
- external provider identity is syntactically valid and is not a local provider;
- source is an approved bounded canary or Production runtime evidence producer;
- Production environment;
- exact 40-character release SHA matches the currently running Vercel release;
- observation is fresh within the 15-minute TTL and clock-skew bound;
- external provider invocation actually succeeded;
- receipt cost mode matches the current LANERIQ cost mode;
- provider is allowed by the current cost policy, including verified free-tier hard-stop requirements;
- no user data is included in an evidence canary;
- bounded canaries use the `provider-health` request class, SHA-256 prompt digest, and at most 64 output tokens;
- HMAC-SHA256 signature verifies using the internal Provider Evidence signing secret.

Any failed condition keeps the provider non-LIVE.

## Receipt registry

Verified receipts may be recorded in a bounded in-memory registry. The registry stores at most 32 current canonical receipts, keeps only the newest receipt per provider, and automatically removes receipts that become stale or invalid under the current release/cost policy. It is intentionally ephemeral and does not claim durable cross-instance evidence storage.

A future controlled external-provider evidence producer may call the internal recording function after it has performed a bounded authorized canary. Ordinary generation success never records a canonical receipt automatically.

## Cost and privacy rules

Zero mode cannot promote metered external providers to LIVE. Free mode requires the provider to be in the free-tier allowlist and to have an explicitly verified provider-account hard stop when the provider may charge. Evidence canaries must use synthetic health prompts only; user prompts and user content are not permitted.

## Preserved architecture

Provider Evidence v2 layers on top of the existing Provider Router, Compute Fabric telemetry, semantic reuse / zero-cost admission truth, admin-only local canary, OIDC Cloud architecture, and server-independent Provider Router. It does not introduce LANERIQ-owned dedicated servers, paid fallback, credits, Email/SMS work, UI changes, or Malware Defense business-logic changes.
