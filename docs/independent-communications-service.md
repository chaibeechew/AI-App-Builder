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

The public status endpoint is:

`GET /api/communications/v1/status`

It returns only sanitized capability/evidence information. It never returns provider tokens, recipients, message content or secrets.

## Future extraction path

1. Keep `service-core.js`, channel contracts, zero-cost policy and routing unchanged.
2. Move the runtime adapter into a dedicated communications deployment.
3. Introduce authenticated service-to-service dispatch with replay-safe signed requests.
4. Move delivery jobs/receipts/provider-health into the communications datastore.
5. Point LANERIQ AI to the standalone service URL through a client adapter.
6. Preserve the embedded adapter as a fallback until standalone production evidence is complete.

## Non-goals for this phase

- No dedicated server purchase.
- No paid SMS activation.
- No claim that provider-ready channels are LIVE.
- No public arbitrary-send endpoint before replay-safe service authentication and persistent idempotency are present.
