# LANERIQ OmniChannel Communication Service

## Goal

Run today inside LANERIQ AI at zero additional infrastructure cost, while keeping the communications domain extractable into a standalone service later without rewriting channel routing, cost policy, message normalization or provider contracts.

## Stable core

The standalone core lives under `lib/communications/` and must remain independent of UI routes, React, Next.js request objects, Vercel APIs and direct Supabase imports.

Core responsibilities:

- canonical message envelope
- channel contract
- zero-cost routing and fail-closed paid-provider policy
- provider-agnostic capability model
- dispatch planning
- channel failover semantics
- evidence semantics (`CODE`, `PROVIDER_READY`, `LIVE`, `PRODUCTION`, `DEVICE_VERIFIED` remain distinct)

## Runtime ports

`service-core.js` consumes only two runtime ports:

1. `adapterStatus()` — returns channel capability/cost/health information.
2. `senders()` — returns channel sender functions.

The current LANERIQ AI deployment supplies these through `runtime-port.js`. A future standalone deployment may replace the runtime port with another database, queue, provider registry or compute platform without changing the service core.

## Current deployment

`embedded_now_extractable_later`

Sanitized capability endpoint:

`GET /api/communications/v1/status`

Signed service dispatch endpoint:

`POST /api/communications/v1/dispatch`

The dispatch endpoint requires a configured service client id, HMAC-SHA256 request signature, bounded timestamp, high-entropy nonce and stable idempotency key. Nonce and idempotency claims are persisted through a service-role-only ledger before any channel sender can execute. Paid/unknown-cost channels are still rejected by the server-side Zero-Cost Router even when a signed caller requests them.

The status endpoint never returns provider tokens, recipients, message content or secrets. The dispatch endpoint never accepts unauthenticated arbitrary sends.

## Signed request contract

Headers:

- `x-laneriq-client-id`
- `x-laneriq-timestamp`
- `x-laneriq-nonce`
- `x-laneriq-signature`

Canonical signature input:

`clientId + timestamp + nonce + method + path + SHA256(body)`

The HMAC secret must remain server-side. Requests older/newer than the allowed clock window are rejected. A nonce may only be claimed once. A stable message idempotency key may only be claimed once per service client, including when a retry uses a new nonce.

## Future extraction path

1. Keep `service-core.js`, channel contracts, zero-cost policy, request-signature contract and routing unchanged.
2. Move the runtime adapter into a dedicated communications deployment.
3. Set `LANERIQ_COMMUNICATIONS_SERVICE_URL` in LANERIQ AI and use the signed remote client.
4. Move delivery jobs/receipts/provider-health into the communications datastore.
5. Expand from one configured service client to a managed client-key registry if external LANERIQ products need access.
6. Preserve the embedded adapter as a fallback until standalone production evidence is complete.

## Non-goals for this phase

- No dedicated server purchase.
- No paid SMS activation.
- No claim that provider-ready channels are LIVE.
- No unauthenticated arbitrary-send endpoint.
- No multi-client public API key marketplace; service access remains private infrastructure.
