# LANERIQ OmniChannel Communication Service

## Goal

Run today inside LANERIQ AI at zero additional infrastructure cost, while remaining extractable into a standalone service without rewriting channel routing, cost policy, message normalization or provider contracts.

## Stable core

`lib/communications/service-core.js` stays independent of UI routes, React, Next.js request objects, Vercel APIs and direct Supabase imports. It owns the canonical message envelope, channel contract, zero-cost routing, provider-agnostic capability model, dispatch planning, failover and evidence semantics.

## Runtime ports

The core consumes only `adapterStatus()` and `senders()`. The current app supplies them with `runtime-port.js`; a future standalone deployment can replace storage, queue, provider registry or compute without changing the core.

## Current deployment

`embedded_now_extractable_later`

- `GET /api/communications/v1/status` — sanitized capability/evidence status only.
- `POST /api/communications/v1/dispatch` — private signed service dispatch.

Dispatch requires a configured service client ID, HMAC-SHA256 signature, bounded timestamp, high-entropy nonce and stable idempotency key. The nonce and idempotency key are privacy-hashed and atomically persisted through service-role-only RPCs before any sender executes. Signed callers still cannot bypass the RM0 policy unless the server explicitly enables customer-billed routes.

## Signed request contract

Headers: `x-laneriq-client-id`, `x-laneriq-timestamp`, `x-laneriq-nonce`, `x-laneriq-signature`.

Canonical signature input is client ID + timestamp + nonce + method + path + SHA256(body). The HMAC secret remains server-side. Stale signatures, reused nonces and reused idempotency keys do not trigger another delivery.

## Extraction path

1. Keep service core, channel contracts, zero-cost policy and signature contract unchanged.
2. Move the runtime adapter to a dedicated communications deployment.
3. Configure `LANERIQ_COMMUNICATIONS_SERVICE_URL` in LANERIQ AI and use the signed remote client.
4. Move delivery jobs, receipts and provider health into the communications datastore.
5. Expand to a managed service-client registry only when another LANERIQ product genuinely needs access.
6. Keep embedded mode as fallback until standalone Production evidence exists.

## Current boundaries

- No dedicated server purchase.
- No paid SMS activation.
- No unauthenticated arbitrary-send endpoint.
- Provider-ready is never labeled LIVE.
- Browser/Production evidence never substitutes for physical-device delivery evidence.
