# LANERIQ Unified Intelligence Core v1 — Stacked Integration

## Purpose

Turn LANERIQ's Creative Media, Reality Intelligence, Project Memory, Provider Router and Security Intelligence foundations into one governed execution spine without pretending that future research capabilities are already LIVE.

## Dependency state

This branch is being realigned to main `6df0f1d5ef8538c3becb3894c8bb3609b85e717a`.

Reality Intelligence Foundation is now Production-integrated in main by Batch 169, so Unified Core consumes `lib/reality/**` directly from main and no longer carries PR #316 runtime files in its diff.

Creative Media PR #312 is still open, so this branch temporarily stacks only the four runtime modules needed for Image 5-layer / Video 6-layer hardening. When Production Release Control integrates #312, this PR must be realigned again and those duplicate Creative Media runtime diffs should collapse.

## Unified Core v1

1. **Reality Context Protocol** — one canonical project-scoped identity for world, version, branch, character, asset, scene, timeline and evidence.
2. **World Event Log** — append-only event sourcing with expected-version conflict protection, SHA-256 hash chaining, verification, replay and independently verifiable forks.
3. **Evidence Ledger** — append-only, hash-chained evidence with expiry, evidence levels and privacy-field rejection.
4. **Capability Memory** — sanitized aggregate module/task performance only; no raw prompts, raw media, private files, credentials or user identity.
5. **Simulation Calibration** — compare simulations with later independently evidenced outcomes; simulation remains simulation and never becomes guaranteed prediction.
6. **Action Authority** — Security Intelligence supplies defensive risk input but cannot authorize CLEAN; scoped permission, trust evidence and human approval gates remain separate.
7. **Creative World Bridge** — provider-independent canonical world IDs feed Creative Media continuity; only accepted, signed-observed, evidence-ledger-bound outputs can propose world updates.
8. **Executable Reality Compiler** — semantic intent becomes an ordered DAG: context → world → simulation (when needed) → fabric → cost admission → execution → judge → repair → evidence → authority (when needed) → world update.
9. **Unified Intelligence Orchestrator** — one entry point for planning and admitting observed Creative results into the versioned world.
10. **Read-only status surface** — exposes CODE truth without implying Unified Core or Creative Media #312 have already merged to Production.

## Fail-closed invariants

- Zero/free mode cannot silently escalate to premium.
- Provider self-report cannot promote output quality.
- World updates require accepted real-output quality plus signed observed Evidence Ledger entries bound to the artifact hash.
- Stale evidence cannot satisfy current evidence gates.
- Event version conflicts fail instead of overwriting concurrent world changes.
- Tampered event/evidence hash chains fail verification.
- Irreversible actions require human approval.
- External actions require an explicit scoped approval and a security check.
- Security Intelligence cannot declare CLEAN by itself.
- Shared Capability Memory rejects private/raw fields.
- Simulation and counterfactual ranking are not real-world prediction.

## Not claimed LIVE

This integration does **not** claim a frontier persistent world model, real-world causal prediction, autonomous physical-device control, million-agent civilization, premium creative provider connectivity, or externally benchmarked Reality Intelligence quality.

## Production integration rule

Do not merge this stacked PR directly merely because CI is green. Production Release Control must integrate or otherwise account for #312, realign this PR to the then-latest main, rerun exact-head CI, and only then consider final integration.
