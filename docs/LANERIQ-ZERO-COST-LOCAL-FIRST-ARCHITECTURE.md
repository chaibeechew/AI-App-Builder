# LANERIQ Zero-Cost Local-First Architecture

## Product goal

LANERIQ minimizes cloud cost by preferring the customer's own devices for eligible compute and working data, while preserving explicit consent, thermal protection, security and reliable cloud fallback.

## Runtime order

1. Cache / deterministic tools
2. Local NPU when a native LANERIQ runtime exposes an eligible path
3. Local GPU
4. Local CPU
5. Customer's own linked Desktop
6. Zero-cost/free-tier provider routes allowed by the active cost policy
7. Cheap metered cloud only when an explicit paid/balanced policy permits it
8. Premium cloud only when the active service policy permits it

The router must never use another customer's device as compute capacity.

## Device policy

- Mobile, tablet, laptop and desktop have separate scheduler ceilings.
- `Gaming Mode` is the default after the customer explicitly allows Local Compute.
- `Battery Saver` reduces local load.
- `Performance` permits larger short bursts but never disables Thermal Guardian.
- Background compute is OFF by default and requires a separate user opt-in.
- Own-Desktop remote compute is OFF by default and requires a separate user opt-in.
- Cross-user compute is permanently disabled.

Scheduler percentages are workload ceilings for LANERIQ workers, not promises that an operating system will expose or maintain an exact hardware utilization percentage.

## Thermal truth boundary

Browser JavaScript does not have a reliable cross-platform CPU/GPU/NPU temperature API. The web app therefore reports thermal state as `unknown` unless an installed LANERIQ native wrapper supplies real OS thermal telemetry through the approved native bridge. LANERIQ must never fabricate a healthy thermal reading.

When a real thermal signal is available:

- nominal: normal local budget
- fair/light/warm: proactively reduce local budget
- serious/severe: redirect heavy work to the customer's own Desktop when available, otherwise cloud fallback
- critical: minimize local work and redirect

## Local-first storage

Working project data should remain local where the client runtime can do so safely. The web client may use browser storage and request persistent storage. Native Desktop/iOS/Android clients should use their sandboxed local storage/SQLite/file system.

Cloud database remains authoritative for identity, ownership, subscription/service state, security-sensitive usage state and synchronization metadata. Large working files and caches should not be stored as relational database rows.

## Smart Sync contract

Cross-device synchronization should prefer content hashes and delta/patch transfer rather than re-uploading a full project for every small edit. The current policy marks delta sync as preferred; production P2P/remote Desktop transport still requires the native LANERIQ clients and must not be labeled LIVE until verified on real devices.

## Cost control

The current product stage uses an invisible cost governor. User-facing Credits are not required as the primary interaction model. Existing credit/accounting backend compatibility may remain until safely migrated because it is part of existing finance and release gates, but the primary UI should use service-level/fair-use behavior rather than per-action credit pressure.

Cost policy should optimize in this order:

- localize
- cache
- reuse
- route
- compress
- deduplicate
- throttle
- queue
- limit

## Consent

Terms/Privacy describe Local Compute, but the app additionally asks an explicit first-use question:

- Allow Local Compute — Recommended
- Use Cloud Only

The device choice is changeable later. Background compute and own-Desktop remote compute are separate choices.

## Evidence boundary

### Implemented in the web code in Batch 13

- explicit first-use Local Compute choice
- Battery Saver / Gaming / Performance policies
- separate mobile/tablet/laptop/desktop scheduler budgets
- Thermal Guardian fail-safe policy
- truthful native thermal bridge contract (`unknown` on web when no native signal exists)
- local browser storage preference and persistence request
- own-Desktop fallback preference setting
- background-compute separate opt-in
- cross-user compute prohibition
- public device/cost policy API
- invisible-cost-governor policy flags
- primary UI de-emphasizes Credits

### Not yet allowed to be called LIVE

- physical iPhone/Android NPU/GPU inference
- native Desktop heavy model execution
- real Desktop↔mobile encrypted remote compute transport
- production delta/P2P synchronization
- App Store / Google Play distributed-client evidence

Those require native clients, OS-specific runtime implementations and physical-device/store evidence before LANERIQ can claim LIVE support.
