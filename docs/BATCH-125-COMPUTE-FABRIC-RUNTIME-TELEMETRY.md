# Batch 125 — Compute Fabric Runtime Telemetry

## Goal

Connect the existing Provider Router runtime counters to LANERIQ Zero-Cost Compute Fabric v2 so operators can observe a truthful confirmed zero-cost resolution rate without exposing provider identities or misclassifying paid/balanced traffic.

## Scope

- derive per-instance Compute Fabric telemetry from Provider Router runtime truth;
- publish sanitized aggregate telemetry on the existing read-only Provider Router status endpoint;
- count remote free-tier success as confirmed zero-cost only under free-mode hard-stop policy;
- keep balanced/paid remote success unclassified without provider-level cost evidence;
- flag any zero-mode remote-success observation as a policy violation and invalidate an exact-rate claim;
- preserve 100 logical worker / 10 active-agent fan-out boundaries;
- preserve admin-only executable canaries and provider identity secrecy.

## Evidence boundary

The telemetry is per-runtime-instance routing evidence. It does not prove permanent provider quota, third-party invoices, native-device inference, unlimited compute, or Production LIVE state.

## Production control

This batch starts from main `9e77f97aeb31ed5b1580aff0a0ef201f36db3f65`. It must pass PR CI and be rechecked against the latest main before merge. After merge, Production Release Control must repeat exact-SHA deployment/runtime checks. The existing Cloud admin-only OIDC round-trip canary remains a separate Production verification requirement and is not bypassed by this batch.
