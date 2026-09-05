# Batch 126 — Zero-Cost Admission Controller + Semantic Reuse Network v2

## Goal

Reduce LANERIQ AI inference spend before a provider call happens. Batch 126 adds an admission decision in front of provider execution and a scope-isolated reuse layer that can satisfy repeated work without invoking another model.

## Admission order

For the integrated runtime path the decision order is:

1. deterministic result when already available;
2. scoped semantic reuse hit;
3. local zero-cost engine;
4. verified free-tier provider only in `free` mode and only when the account hard stop is explicitly allowlisted;
5. queue for eligible non-interactive zero-cost work;
6. paid provider only in balanced/paid modes with explicit paid-fallback authorization;
7. otherwise block/fail closed.

`zero` and `free` modes are not permitted to produce a paid-provider admission decision.

## Local-before-remote execution

`generateWithZeroCostAdmission` executes configured local providers before consuming a verified free-tier remote quota. If local execution succeeds, no remote request is made. In `zero` mode a local failure cannot escalate to a remote metered provider. In `free` mode a remote provider may be attempted only when it belongs to the verified hard-stop free-provider set.

## Semantic Reuse Network v2

Full AI results are private-result cache entries and require an explicit scope such as `user:<id>`. The scope value is hashed before entering the in-memory key. Raw prompts are not stored in the reuse index.

Private full-result reuse rules:

- same scope required;
- exact normalized fingerprint reuse allowed;
- approximate private-result reuse forbidden;
- cross-user private-result reuse forbidden;
- bounded TTL, bounded entry count and bounded result size;
- runtime-local/ephemeral until a separately reviewed persistent design exists.

Approximate reuse is available only for explicitly classified `blueprint` entries and only within an explicit scope with a high similarity threshold. Batch 126 does not enable cross-user blueprint sharing.

## First Production path integration

`POST /api/chat` now uses `generateWithZeroCostAdmission` instead of calling the Provider Router directly. Chat reuse is scoped to the authenticated user, includes the bounded conversation in the reuse key material, disables approximate reuse and disables paid fallback.

This is the first customer-facing runtime integration for the new controller. App generation, image/video execution and other high-cost surfaces remain separate follow-up integrations; Batch 126 does not claim they are already routed through this controller.

## Observability

The existing read-only Provider Router status exposes sanitized aggregate Admission/Reuse telemetry:

- requests;
- reuse hits;
- local resolutions;
- verified-free resolutions;
- paid-policy resolutions;
- queued and blocked decisions;
- local failures before fallback;
- Semantic Reuse aggregate counters.

Provider identity, prompt text, cache keys and user scope values are not exposed.

## Evidence boundary

This batch proves code behavior and, after deployment, per-runtime routing observations. It does not prove:

- permanent third-party free quota;
- provider invoices or billing statements;
- native iPhone/Android NPU/GPU inference;
- native Desktop heavy-model execution;
- cross-device compute;
- unlimited compute capacity;
- Production LIVE until PR CI, merge, exact-SHA deployment and runtime verification complete.

## Production control

Batch 126 starts from exact `main` `29c653e67cc285827b7937217713f71733988034`. It stays on an independent branch until the full PR CI matrix is green and latest `main` is rechecked. Existing Cloud admin-only OIDC exact-SHA canary requirements remain unchanged and are not bypassed by this batch.
