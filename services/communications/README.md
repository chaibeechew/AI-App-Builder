# LANERIQ Communications Service Host

This directory is intentionally deployable as a separate Vercel Project root. It does not require the LANERIQ AI application runtime or its package dependencies.

## Current boundary

- Public protocol remains `/api/communications/v1/status` and `/api/communications/v1/dispatch`.
- Dispatch is private HMAC-SHA256 service-to-service traffic only.
- Clock skew is bounded to 5 minutes.
- Persistent nonce replay protection and idempotency are enforced through the Production Supabase RPC ledger.
- The first physical host supports zero-external-spend in-app delivery through `server_create_in_app_notification`.
- Paid SMS stays blocked. External channels remain unclaimed until their own provider and live evidence exist.
- Remote uncertainty never falls back to another delivery path automatically.

## Required server-side environment

`SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`), `LANERIQ_COMMUNICATIONS_SERVICE_SECRET`, and `LANERIQ_COMMUNICATIONS_SERVICE_CLIENT_ID`.

The same service secret and client ID are configured in the LANERIQ AI caller together with `LANERIQ_COMMUNICATIONS_SERVICE_URL`. Secrets must never be exposed through public status output or client-side environment variables.

## Physical cutover gate

Do not label this service `LIVE standalone` until a second deployment has an exact Production SHA, the status endpoint is reachable, unsigned dispatch fails closed, a signed in-app canary succeeds once, replay is suppressed, and Production logs are clean. Until then the LANERIQ AI gateway remains in embedded mode.
