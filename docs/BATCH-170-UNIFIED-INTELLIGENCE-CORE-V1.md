# Batch 170 — LANERIQ Unified Intelligence Core v1

## Purpose

Turn LANERIQ's separate Creative Media, Reality Intelligence, Project Memory, Provider Router and Security Intelligence foundations into one governed execution spine without pretending that future research capabilities are already LIVE.

## Stacked dependency state

This branch starts from main `ee5399433801f60fd0abacb99f77ec8d5177e069` and temporarily stacks only the runtime modules required from open PR #312 (Creative Media Image 5-layer / Video 6-layer hardening) and PR #316 (Reality Intelligence Foundation).

The stacked runtime dependency files are not a claim that #312 or #316 have already merged to Production. When Production Release Control merges those PRs, this branch must be realigned to the new main and duplicate dependency diffs should collapse.

## Unified Core v1

1. **Reality Context Protocol** — one canonical project-scoped identity for world, version, branch, character, asset, scene, timeline and evidence.
2. **World Event Log** — append-only event sourcing with expected-version conflict protection, SHA-256 hash chaining, verification, replay and independently verifiable forks.
3. **Evidence Ledger** — append-only, hash-chained evidence with expiry, evidence levels and privacy-field rejection.
4. **Capability Memory** — sanitized aggregate module/task performance only; no raw prompts, raw media, private files, credentials or user identity.
5. **Simulation Calibration** — compare simulations with later independently evidenced outcomes; simulation remains simulation and never becomes guaranteed prediction.
6. **Action Authority** — Security Intelligence supplies defensive risk input but cannot authorize CLEAN; scoped permission, trust evidence and human approval gates remain separate.
7. **Creative World Bridge** — provider-independent canonical world IDs feed Creative Media continuity; only accepted, signed-observed, evidence-ledger-bound outputs can propose world updates.
8. **Executable Reality Compiler** — turns semantic Reality plans into an ordered DAG: context → world → simulation (when needed) → fabric → cost admission → execution → judge → repair → evidence → authority (when needed) → world update.
9. **Unified Intelligence Orchestrator** — one entry point for planning and admitting observed Creative results into the versioned world.
10. **Read-only status surface** — exposes CODE truth without implying Production merge or external LIVE capability.

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

This batch does **not** claim a frontier persistent world model, real-world causal prediction, autonomous physical-device control, million-agent civilization, premium creative provider connectivity, or externally benchmarked Reality Intelligence quality.

## Production integration rule

Do not merge this stacked branch directly merely because its CI is green. Production Release Control must first account for #312 and #316 dependency order, realign this PR to the latest main, rerun CI on the resulting exact head, and only then consider final integration.
