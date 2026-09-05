# LANERIQ Zero-Cost Compute Fabric v2

## Purpose

LANERIQ AI should minimize fixed AI inference cost without pretending that logical agents create physical compute. Compute Fabric v2 turns existing local-first, Provider Router and cost-governor rules into one bounded orchestration contract.

## Core truths

- 100 logical workers are a scheduling namespace, not 100 copies of GPU/AI capacity.
- Active agent fan-out is bounded. Recursive fan-out is never unlimited.
- Zero-cost mode permits only genuinely zero-cost/local providers already allowed by the existing cost policy.
- Free-tier remote providers are eligible only when their provider account has a verified billing/auto-top-up hard stop and the provider is listed in `SOOLEN_FREE_TIER_HARD_STOP_PROVIDERS`.
- Paid compute is last resort and is blocked in zero/free modes.
- Cross-customer compute remains prohibited. Only the customer's own devices may be used when Local Compute is explicitly allowed.
- Physical-device NPU/GPU inference is not declared LIVE until native client and real-device evidence exists.

## Runtime preference order

1. Deterministic/no-AI result
2. Semantic/cache reuse
3. Eligible local device
4. Customer's own linked Desktop
5. Verified free-tier provider capacity
6. Deferred queue for non-interactive work
7. Explicitly authorized paid fallback in balanced/paid policy
8. Degrade/fail closed when no authorized capacity remains

## Agent budget

Compute Fabric exposes a logical worker capacity of 100 while constraining active orchestration to workload envelopes:

- trivial: 1 active agent
- standard: up to 3 active agents
- complex: up to 5 active agents
- critical: up to 10 active agents

The agent tree is also bounded by maximum depth and maximum children per agent. Metered agent calls are zero in zero/free Compute Fabric budgets. Existing candidate-generation free-tier routing may use at most one verified free-tier remote success path, with remaining comparison slots supplied by local/zero-cost shadows or already-produced candidates.

## Paid Compute Firewall

`assertPaidComputeAllowed` fails closed for providers that may charge when the active cost mode is zero or free. Balanced mode requires explicit paid-fallback authorization. Paid mode is still controlled by service policy and normal provider configuration.

Free-tier cloud is not treated as zero-cost merely because a model/provider advertises a free tier. The provider account hard stop must be verified and explicitly allowlisted before the remote provider enters the free routing pool.

## Zero-Cost Resolution telemetry

Compute Fabric v2 uses a confirmed routing metric:

`Confirmed Zero-Cost Resolution Rate = confirmed zero-cost resolved requests / total routed requests`

The metric is deliberately conservative:

- local zero-cost provider success is confirmed zero-cost;
- remote success in `free` mode can be counted only because free-mode routing already requires an account hard-stop allowlist;
- remote success in `balanced` or `paid` mode remains unclassified unless provider-level cost evidence exists;
- any observed remote success while the current runtime is in `zero` mode is treated as a policy-violation signal and invalidates an exact-rate claim.

Provider runtime counters are per-instance and ephemeral. Vercel runtime cost mode is expected to remain immutable for the lifetime of an instance. Telemetry is routing evidence only; it does not prove provider invoices, permanent quota, native-device inference, Production deployment, or unlimited capacity.

## Runtime integration in Batch 124

Implemented in code:

- shared Compute Fabric governor module
- logical worker capacity and active fan-out budgets
- bounded agent-tree policy
- Paid Compute Firewall contract
- deterministic/cache/local/own-Desktop/free/queue/paid route selector
- Zero-Cost Resolution telemetry primitives
- cost-policy flags making Compute Fabric v2 mandatory
- verified free-tier provider hard-stop allowlist
- generation candidate orchestration bound to the shared fan-out envelope
- zero-cost CI contract gate includes Compute Fabric tests

## Runtime telemetry integration in Batch 125

Batch 125 connects existing Provider Router runtime counters to Compute Fabric truth without exposing provider identities or secrets.

The sanitized Provider Router status may expose:

- runtime request/success counts
- local and remote success counts
- confirmed zero-cost resolutions and confirmed resolution rate
- whether the rate is exact for the observed instance
- unclassified remote resolutions in balanced/paid operation
- cost-policy blocks, failovers and proactive quota switches
- logical worker capacity and active fan-out ceiling
- a zero-mode remote-observation violation flag

The public status remains read-only. It does not execute a Provider Router canary, inspect provider credentials, reveal provider names, or promote external-provider availability to LIVE evidence.

## Evidence boundary

Not yet allowed to be called LIVE merely because Compute Fabric code exists:

- physical iPhone/Android NPU/GPU inference
- native Desktop heavy-model execution
- Desktop/mobile encrypted remote compute transport
- production cross-device delta/P2P execution
- proof that any third-party free tier remains free indefinitely
- unlimited AI capacity

Provider Router telemetry also remains instance-local evidence. Production LIVE claims continue to require the separate release/canary evidence defined by Production Release Control.

## Production integration rule

Each Compute Fabric batch must start from the latest `main`, pass its PR CI, merge only against the expected head SHA, then rerun post-merge checks. Production completion still requires GitHub `main`, Vercel Production and runtime release identity to agree on the exact SHA, plus all required service/browser/security evidence. A successful code merge alone is not Production LIVE evidence.
