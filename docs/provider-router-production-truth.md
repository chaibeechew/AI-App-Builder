# LANERIQ AI Provider Router Production Truth

Contract: `prtr1`

## Production truth model

LANERIQ Provider Router separates five states and never upgrades one state into another without evidence:

1. `CODE_READY` — provider adapters, cost filtering, cooldown, fallback and quota logic exist and pass deterministic tests.
2. `RUNTIME_ZERO_COST_ROUTER_CANARY` — the deployed runtime executed the local zero-cost path, but exact Production release identity is not proven.
3. `PRODUCTION_ZERO_COST_ROUTER_CANARY` — a Production deployment with a valid exact Git SHA executed `soolen-local` through the same `generateWithFallback` path without any external provider call.
4. `INSTANCE_RUNTIME_OBSERVED` — a warm runtime instance has observed an external provider success. This is operational telemetry only and is not canonical LIVE evidence.
5. External provider `LIVE` — reserved for a bounded Production canary that proves the named provider, exact release identity, successful response, quota/cost class and fallback behavior. Until that evidence exists, external provider state remains `EVIDENCE_REQUIRED`.

## Zero-cost launch contract

When `SOOLEN_COST_MODE=zero`:

- metered providers are filtered before execution;
- external spend cap is `0`;
- `ollama` and `soolen-local` are the only authorized zero-cost provider classes;
- provider failures do not enable paid fallback;
- the Production status canary invokes only `soolen-local`;
- provider identities and secrets are not exposed by the public truth response.

## Quota and failover contract

The execution router now observes common request quota headers. A successful provider response at or below the proactive remaining-ratio threshold arms a temporary quota guard. The following request skips that provider before making a network call. HTTP `429` and `Retry-After` also arm cooldown/quota protection and the request continues to the next authorized provider.

The default proactive switch threshold is 20% remaining quota and can be reduced or increased within a bounded 1%–50% range using `AI_PROACTIVE_QUOTA_SWITCH_REMAINING_RATIO`.

## Truth Gate

A configured provider is not automatically LIVE. A successful response observed in one serverless instance is not automatically canonical LIVE. Preview, CI simulation and provider-ready adapters are not Production LIVE evidence.

The status endpoint is:

`GET /api/ai/provider-router/status`

Add `?canary=1` to run the bounded local zero-cost runtime canary. The canary does not invoke metered or external AI providers.
