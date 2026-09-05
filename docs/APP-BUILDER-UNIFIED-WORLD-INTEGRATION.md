# LANERIQ App Builder → Unified Intelligence Core

## Purpose

This stage makes App Builder participate in the same project-scoped Reality Context, World State, World Event Log and Evidence Ledger used by LANERIQ Unified Intelligence Core.

The goal is not to label normal App Builder output as a live world model. The goal is to make every accepted App + Website version an evidence-bound state transition with stable provider-independent identity, replay protection and transactional persistence.

## Initial generation

A verified first App + Website build now:

1. passes the existing autonomous generation, deterministic self-test, execution verification and self-heal gates;
2. derives a canonical `projectId` and `worldId` from the stable generation request identity rather than from a cloud-provider database UUID;
3. hashes the normalized specification with SHA-256;
4. creates a World State containing the canonical `app-root` entity;
5. creates an append-only World Event Log at the same world version;
6. creates an Evidence Ledger with LANERIQ deterministic `OBSERVED` evidence bound to the specification artifact hash;
7. stores the serialized project-scoped Reality Envelope with the first app version in the same service-role database transaction.

`OBSERVED` here means LANERIQ deterministic verification evidence. It is not signed external evidence and is not a claim that the build is Production/LIVE verified.

## AI Modify

For a current saved project, AI Modify now:

1. loads the current database version number and project Reality Envelope;
2. keeps the existing expected-version protection before AI work;
3. performs zero-cost admission, deterministic quality comparison, repair and self-heal as before;
4. verifies that the current saved specification hash and app version match the current Reality Envelope;
5. appends new observed evidence for the accepted next specification;
6. appends one World Event and applies one World State transition;
7. requires `eventLog.headVersion === worldState.version`;
8. predicts exactly `base app version + 1` and requires the database RPC to persist that exact next version;
9. commits the new app version and updated Reality Envelope in the same database transaction.

A stale or tampered world envelope, skipped version number, failed quality gate or mismatched specification hash blocks persistence.

## Transaction isolation

The world-aware persistence path uses dedicated service-role RPCs:

- `server_persist_generated_project_world`
- `server_save_app_modification_world`

The pre-existing App Builder RPC names and signatures are left unchanged. This avoids PostgREST overload ambiguity and keeps legacy callers isolated from the new World persistence contract.

## Legacy projects

Projects created before this integration may have no Reality Envelope. The first accepted modification performs a one-time baseline import from the current saved specification.

The imported baseline is clearly marked `baselineImported: true`. LANERIQ does not fabricate historical World Events or pretend older versions were observed by the new Evidence Ledger. The first post-integration modification becomes the first real appended World Event for that imported baseline.

## Replay and concurrency

- Stable generation and modification request IDs remain the idempotency boundary.
- Generation replay cannot rewind World memory after a project has advanced beyond version 1.
- Modification replay updates World memory only when the replayed version is still the current project head.
- The modification RPC derives the next database version from the exact expected version, not from `max(version_no)`.
- App version and project Reality Envelope are committed transactionally.

## Privacy and provider independence

`project_memory.realityEnvelope` is bounded and project-scoped. The sanitizer rejects raw/source prompts, private content, file content, media bytes, chat content, passwords, secrets, tokens, API keys and credentials anywhere inside the envelope.

The Reality Envelope is never included in the prompt-facing Project Memory brief.

Canonical World/Project identity is derived independently of the current cloud database UUID. Supabase remains a storage adapter and authorization boundary; it does not own LANERIQ world identity.

## Truth boundary

This integration provides CODE/CI contracts for:

- App Builder world orchestration;
- deterministic observed evidence;
- event-sourced project-world transitions;
- transactional app-version/world-memory persistence;
- legacy baseline migration;
- tamper/stale/replay fail-closed behavior.

It does **not** claim:

- external signed evidence;
- Production or runtime LIVE verification;
- real future prediction;
- autonomous physical control;
- a frontier persistent world model.

Final Production integration must follow Production Release Control dependency order. This branch is stacked on Unified Intelligence Core v1 until that dependency is integrated into `main`; it must then be realigned to the latest `main` and exact-head CI rerun before final merge.
