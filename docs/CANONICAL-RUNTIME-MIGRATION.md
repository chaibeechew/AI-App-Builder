# LANERIQ AI Canonical Runtime Migration

## Authority

`/api/laneriq/*` is the canonical product runtime namespace for new LANERIQ platform APIs.

Existing `/api/soolenai/*` routes remain compatibility surfaces during gradual migration. They are not the target namespace for new LANERIQ features.

## Adapter rule

New LANERIQ routes and libraries must not directly import legacy `lib/soolen/*` modules or the current database provider. Any temporary legacy dependency must cross the explicit `lib/laneriq/legacy-runtime-adapter.js` boundary.

This makes the compatibility layer measurable, replaceable and removable without forcing a one-shot Production migration.

## Canonical APIs introduced in Batch 107

- `/api/laneriq/capabilities`
- `/api/laneriq/platform`
- `/api/laneriq/runtime/status`

These routes identify LANERIQ as the authority, hide provider names from standard customer surfaces and preserve the existing truth boundaries for provider, Production and real-device evidence.

## Migration sequence

1. Add canonical LANERIQ APIs without deleting compatibility routes.
2. Move internal consumers to canonical APIs in later isolated Batches.
3. Move legacy implementation logic from `lib/soolen/*` into LANERIQ-owned domains behind stable contracts.
4. Reduce the compatibility adapter until it has no remaining runtime responsibilities.
5. Remove old API aliases only after Production telemetry proves no supported client still depends on them.

## Truth boundary

A canonical API namespace does not mean all legacy internals have already been removed. Batch 107 establishes the migration boundary and prevents new direct coupling; removal of remaining legacy implementations is a separate evidence-gated process.
