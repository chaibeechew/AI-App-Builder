# LANERIQ AI Canonical Voice Migration

## Canonical surface

New LANERIQ consumers should target `/api/laneriq/voice`.

The existing `/api/soolenai/voice` route remains available during compatibility migration and is not removed by this Batch.

## Boundary

The canonical route imports only the LANERIQ voice compatibility adapter. Current Supabase identity, subscription policy, legacy voice configuration and provider-specific calls are contained inside that adapter so they can be migrated independently later.

## Preserved safeguards

- authenticated user required
- Professional tier required
- HTTPS required for the open-source provider endpoint
- bounded provider timeout
- maximum 5,000 characters per request
- maximum 16 MiB voice output
- private/no-store responses
- provider names hidden from the public readiness response

## Truth boundary

The canonical endpoint is CODE/CI migration work. `providerLiveVerified` and `realOutputQualityVerified` remain false until actual Production provider/output evidence exists.

## Next migration

After Production Control integrates the canonical namespace and client consumers have migrated, the underlying legacy voice configuration can be renamed/moved into LANERIQ-owned modules. The old route should only be removed after dependency inventory, Production telemetry, rollback and exact-SHA evidence are complete.
