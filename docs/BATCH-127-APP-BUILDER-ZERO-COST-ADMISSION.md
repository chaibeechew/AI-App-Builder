# Batch 127 — App Builder Zero-Cost Admission

## Goal

Move the highest-frequency App Builder AI execution paths behind the same fail-closed Zero-Cost Admission and scoped Semantic Reuse v2 boundary introduced in Batch 126.

## Integrated paths

1. Initial autonomous App + Website generation (`engine/autonomous-engine.js`)
2. AI Modify primary generation
3. AI Modify quality repair
4. AI Modify structural Self-Heal

## Routing contract

For these paths, LANERIQ uses the existing admitted execution order:

`SCOPED EXACT REUSE -> LOCAL -> VERIFIED FREE (free mode only) -> BLOCK`

Paid fallback is disabled by the App Builder admission helper. In Zero mode, no metered remote provider is admitted. In Free mode, a remote free-tier provider is only eligible after the existing billing/auto-top-up hard-stop verification policy accepts it.

## Private reuse boundary

- Full generated specifications are `private_result` entries.
- Approximate private-result reuse is disabled.
- Cross-user private-result reuse is disabled.
- Initial Generation uses a user-scoped App Builder namespace when authenticated request identity is available.
- If trusted request identity cannot be resolved (for example pure Node CI/offline execution), reuse is disabled rather than falling back to a shared scope.
- Modify/repair/self-heal reuse is scoped to both user and project.
- Modify reuse is additionally bound to the current base version ID so a result computed against an older project version cannot be reused after the project changes.
- The existing Semantic Reuse layer does not store raw prompt text in its index and remains runtime-ephemeral.

## Existing boundaries preserved

This batch does not change:

- App Builder authentication and verified-account requirements.
- replay/idempotency handling.
- entitlement/financial persistence ordering.
- atomic project/version persistence.
- quality regression rejection.
- Cloud service-role isolation.
- Provider identities/secrets.
- SMS state (still on hold).
- Cloud Data admin-only OIDC canary requirements.

## Evidence level

This batch can prove code/runtime routing behavior after CI and deployment. It does **not** prove:

- permanent third-party free quota,
- unlimited compute,
- native iOS/Android NPU/GPU inference,
- Desktop heavy-model execution,
- cross-device compute,
- provider billing statements.

Production completion still requires the normal exact-SHA chain and all independent release evidence gates.
