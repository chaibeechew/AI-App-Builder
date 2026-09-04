# LANERIQ Legacy Surface Retirement Policy

LANERIQ AI is migrating away from legacy SoolenAI API namespaces without breaking supported clients.

## Ratchet rule

The current compatibility budget is three top-level API roots:

- `/api/soolenai/capabilities`
- `/api/soolenai/platform`
- `/api/soolenai/voice`

This budget may decrease but must never increase. New LANERIQ features must not add a fourth legacy root.

## Canonical replacements

Capabilities and platform are targeted at `/api/laneriq/capabilities` and `/api/laneriq/platform`. Voice is targeted at `/api/laneriq/voice` in a later isolated migration.

Replacement entries in the manifest are planning/integration state only and must not be labeled LIVE without Production evidence.

## Removal gate

A legacy surface may be removed only when all of the following are evidenced: canonical replacement, supported-client dependency clearance, Production telemetry showing no required legacy traffic, verified rollback plan, and Production exact-SHA reconciliation.

The objective is monotonic independence: compatibility can shrink safely, but new product functionality cannot expand the old namespace again.
