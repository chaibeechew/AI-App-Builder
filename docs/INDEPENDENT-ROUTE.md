# LANERIQ AI Independent Route

## Goal

LANERIQ AI is the runtime owner of the product. Legacy SoolenAI and historical AI App Builder surfaces may remain only as temporary compatibility layers during migration; they are not required runtime dependencies for the independent route.

## Current migration strategy

LANERIQ stays server-independent for now. External AI must continue through the Provider Router. Supabase and Vercel remain replaceable infrastructure providers behind LANERIQ-owned boundaries rather than becoming product-level dependencies. Migration is gradual and must not interrupt Production.

## Service boundaries

1. `laneriq-ai` — customer application and primary Product UI/API surface.
2. `laneriq-cloud-data` — data/control-plane boundary. Current provider-specific persistence stays behind adapters.
3. `laneriq-malware-defense` — security control plane. Security truth and evidence remain independently deployable.
4. `laneriq-creative-media` — logical creative-media control-plane boundary. A dedicated external deployment is optional until there is enough scale or operational value.
5. `laneriq-provider-router` — provider control plane. External AI providers must remain replaceable and must not become direct product dependencies.

## Runtime endpoint contract

Independent remote service endpoints, when configured, use LANERIQ-owned environment contracts:

- `LANERIQ_CLOUD_DATA_URL`
- `LANERIQ_MALWARE_DEFENSE_URL`
- `LANERIQ_CREATIVE_MEDIA_URL`
- `LANERIQ_PROVIDER_ROUTER_URL`

During gradual migration, services may execute through the local boundary when no remote endpoint is configured. This preserves zero-downtime migration while maintaining a stable LANERIQ-owned contract.

## Forbidden regressions

- New required runtime dependency on SoolenAI.
- New required runtime dependency on historical AI App Builder deployments.
- New provider secrets in public status routes.
- New direct provider coupling in provider-opaque Cloud domains.
- Bypassing Provider Router for new external AI integrations.
- Claiming a dedicated LANERIQ server is LIVE before it has Production evidence.

## Infrastructure stages

- Now: server-independent, provider-router-first, provider-opaque boundaries.
- Around 20k–50k MAU: evaluate the first dedicated/bare-metal LANERIQ workload only if economics and reliability justify it.
- Around 50k–100k MAU: consider a small cluster for workloads that clearly benefit from ownership.
- Above 100k MAU: move selected workloads to multi-node infrastructure.
- Million-user scale: multi-region only when real traffic, latency and resilience evidence justify it.

These are planning thresholds, not claims that dedicated infrastructure is already LIVE.

## Production truth

CODE/CI independent-route readiness does not imply every service is already a separate Production deployment. Each remote service remains evidence-gated. GitHub main SHA, Vercel Production SHA and runtime verified SHA must still be reconciled by Production Release Control before a release is declared complete.
