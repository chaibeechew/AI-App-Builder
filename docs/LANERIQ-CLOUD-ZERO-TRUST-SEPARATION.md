# LANERIQ Cloud — Zero-Trust Separation Architecture

## Decision

LANERIQ Cloud remains inside the current LANERIQ AI product for now, but is implemented as a distinct domain boundary so it can later be extracted into an independent service without moving the Builder UI or rewriting product workflows.

The current product must not claim that a dedicated LANERIQ server, full provider-adapter migration, native zero-knowledge key custody or full client-side encryption is LIVE until production/runtime evidence exists.

## Stable boundary

LANERIQ AI Builder and account surfaces should depend on LANERIQ Cloud contracts rather than one infrastructure vendor.

The Cloud domain owns stable capability contracts for:

- identity
- database
- storage
- realtime
- functions
- deployment
- backup
- AI

Provider SDKs belong behind adapters. New code in `lib/cloud/`, `app/api/cloud/` and `app/account/cloud/` must remain provider-opaque and must not import Supabase, Vercel or another provider SDK directly.

Existing direct provider integrations are compatibility debt and should be migrated workload-by-workload rather than replaced in one risky cutover.

## Separation path

### Stage A — embedded separable module (current)

LANERIQ AI and LANERIQ Cloud ship in one Next.js application. The Cloud domain provides contracts, routing/security policy and public evidence boundaries.

### Stage B — adapter migration

Legacy routes are moved behind LANERIQ Cloud adapters in small batches. No new direct provider coupling is added.

### Stage C — independent service

`lib/cloud` contracts become the client/service contract. Provider adapters, queues and control-plane logic can move to an independent LANERIQ Cloud deployment while LANERIQ AI keeps the same contract.

### Stage D — LANERIQ infrastructure

Dedicated/bare-metal workloads are introduced only when total cost of ownership is lower than the current provider path and redundancy, backup restore, security and observability gates are all ready.

## Zero-trust data classes

- `public`: public assets and public metadata; cloud allowed.
- `normal`: ordinary product metadata; cloud allowed with standard controls.
- `private`: user/project private content; the new Cloud contract requires encrypt-before-cloud for shared-cloud synchronization.
- `secret`: API keys, service-role credentials and provider tokens; browser plaintext is blocked and a server-side secret vault is required.

## Privacy truth boundary

Client-side encryption and zero-knowledge design are targets, not automatic claims.

A real LIVE zero-knowledge claim additionally requires native/platform key custody, recovery design, encrypted sync implementation, threat-model review, cross-device key exchange, rotation/revocation and production evidence. Until those exist, LANERIQ surfaces must report them as not yet LIVE.

## Local-first and cost order

1. local device / local database / local files
2. cache / deterministic reuse
3. customer's own linked devices where explicitly enabled
4. zero-cost eligible shared-cloud adapter only when cloud behavior is needed
5. metered shared cloud when policy permits
6. dedicated LANERIQ infrastructure only after the economics + operations gate passes

The user count alone does not trigger a dedicated server purchase.

## Dedicated server gate

Migration requires both:

- `dedicated TCO < current provider TCO`
- operational readiness: redundancy, backup, restore evidence, security and observability

Migration remains workload-by-workload. Supabase/Vercel compatibility paths are not removed in one cutover.

## Security invariants

- default deny
- provider names and secrets stay out of public policy surfaces
- service-role / secret keys never enter browser code
- private cloud synchronization requires client-side encryption under the new contract
- secrets require a vault target
- minimum necessary AI context
- short-lived object grants preferred
- encrypted backups required
- append-only/tamper-resistant audit is a design requirement
- CODE/provider-ready status must never be promoted to LIVE without runtime evidence

## Batch 14 — Project boundary + private envelope hardening

The first legacy data path has started real adapter migration rather than remaining architecture-only:

- `app/api/apps/route.js` and `app/api/apps/[id]/route.js` call the provider-opaque `lib/cloud/projects.js` domain.
- Current provider-specific session/query behavior lives behind `lib/cloud-adapters/project-data.js`.
- The compatibility adapter keeps user-scoped access and explicit `owner_id` filtering; it does not use an admin/service-role bypass client.
- CI applies a shrinking direct-provider route budget. Full filesystem scanning established the real baseline at 79 route-level imports; after this batch the maximum accepted budget is 77. Future work may lower the number but may not increase it.

A versioned private-data encryption envelope is now defined in `lib/cloud/encryption-envelope.js`:

- AES-256-GCM authenticated encryption
- random 96-bit nonce per envelope
- 128-bit authentication tag
- tenant + project + purpose + key ID bound as additional authenticated data
- raw key material is never stored in the envelope
- imported project keys are non-extractable
- altered ciphertext or a changed project context must fail authentication

This is a CODE foundation for encrypt-before-cloud. It is not evidence that encrypted synchronization, native secure key custody, cross-device key exchange, recovery, rotation/revocation or zero-knowledge operation is fully LIVE.

## Current truthful evidence boundary

### Verified in code/CI when Batch 14 passes

- separable LANERIQ Cloud domain
- provider-opaque Project list/detail route layer
- compatibility provider adapter boundary
- direct-provider coupling ratchet
- versioned authenticated private-data encryption envelope
- tamper/context-mismatch rejection contract

### Still not allowed to be called fully LIVE

- all legacy provider calls migrated to LANERIQ Cloud adapters
- end-to-end encrypted production synchronization
- native Secure Enclave / Keychain / Keystore / TPM key custody
- zero-knowledge recovery and cross-device key exchange
- dedicated LANERIQ server infrastructure

These remain separate evidence gates and must not be promoted by code readiness alone.
