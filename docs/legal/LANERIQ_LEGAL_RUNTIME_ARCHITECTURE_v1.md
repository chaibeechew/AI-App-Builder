# LANERIQ AI Legal Runtime Architecture

**Version:** LANERIQ-LEGAL-RUNTIME-v1-DRAFT  
**Status:** DRAFT ARCHITECTURE — NOT A SUBSTITUTE FOR QUALIFIED MALAYSIAN LEGAL REVIEW  
**Release dependency:** PR #237 → PR #244 → Batch 115 realignment to latest `main` → CI → Production Release Control

## 1. Purpose

This architecture converts LANERIQ AI legal documents from passive Markdown into enforceable runtime controls without pretending that a draft is already binding.

The four core controls are:

1. Legal Version Registry;
2. Consent / Signature Ledger;
3. Privacy Incident Clock; and
4. Marketplace Transaction Truth Gate.

No legal document becomes binding merely because its file exists in GitHub or because this runtime migration is deployed.

## 2. Legal Version Registry

`legal_document_versions` is the source of truth for runtime legal identity.

Each legal version records at least:

- stable `document_key`;
- exact legal `version`;
- SHA-256 `document_hash`;
- Git source path and optional source commit SHA;
- required acceptance level;
- lifecycle state;
- legal approval reference; and
- effective / activation timestamps.

Lifecycle:

`draft → legal_approved → active → superseded/retired`

Rules:

- only one ACTIVE version may exist for the same document key;
- approved identity/hash fields are immutable;
- ACTIVE versions cannot regress to Draft;
- superseded/retired versions cannot be silently reactivated;
- Batch 115 intentionally seeds **zero ACTIVE legal versions**.

## 3. Consent / Signature Ledger

`legal_acceptance_events` is append-oriented evidentiary storage.

A binding acceptance can be inserted only if the referenced legal version is ACTIVE at insertion time and all of these snapshots match it exactly:

- document key;
- version;
- SHA-256 document hash; and
- acceptance level.

Evidence stores only controlled fields such as a request ID, UI surface, locale, user-agent hash, assurance level and the authenticated user ID. It must not store passwords, raw OTPs, full payment-card data, private keys, government-ID images or handwritten signature images.

### Acceptance strength

- `notice` — authenticated acknowledgement where suitable;
- `clickwrap` — ordinary authenticated affirmative acceptance;
- `strong` — high-assurance acceptance;
- `bilateral` — material transfer/signing by transaction actors.

For `strong` and `bilateral`, the current implementation requires a verified AAL2 session before the server will write evidence. There is no silent downgrade to ordinary session acceptance.

The public/browser client never receives the Supabase service credential and cannot directly write the legal evidence tables.

## 4. Legal APIs

### `GET /api/legal/document?key=...`

Returns only the current ACTIVE fingerprint needed for presentation:

- document key;
- version;
- SHA-256 hash;
- acceptance level; and
- effective/activation timestamps.

A Draft or merely legal-approved version is not returned as an active contract.

### `POST /api/legal/acceptance`

Requires an authenticated LANERIQ session and the exact version/hash the user was shown.

The server re-reads the ACTIVE version and the database trigger validates it again during insertion. This provides a double-check against race conditions or stale UI.

Self-service actor roles are intentionally limited to account holder, Seller and Buyer. Operator and Enterprise authority require a later, separately verified authority workflow.

### `GET /api/legal/marketplace/truth-gate?transactionId=...`

Seller or Buyer can inspect readiness without obtaining direct table access. The server invokes a service-role-only PostgreSQL evaluator.

## 5. Privacy Incident Clock

`privacy_incidents` separates a technical security event from a legally reportable personal-data breach.

Important fields include:

- occurrence/detection/confirmation times;
- regulatory assessment state;
- explicit `clock_anchor_at`;
- explicit `clock_basis`;
- notification window (currently defaulted to 72 hours for the Malaysian PDPA operational design);
- computed deadline;
- Commissioner notification evidence; and
- data-subject notification evidence where applicable.

The architecture deliberately does **not** hard-code `confirmed_breach_at + 72 hours` as the universal legal formula. The applicable anchor must be recorded with its basis because real breach scenarios can establish awareness/occurrence at different points. Legal/regulatory assessment determines the correct anchor.

Every incident state change creates a limited audit snapshot. Sensitive breach details remain in controlled incident fields rather than being copied indiscriminately into logs.

## 6. Marketplace Transaction Truth Gate

`app_sale_transactions` records the material transfer state without allowing the UI to declare ownership complete merely because payment or signatures exist.

A transaction cannot enter `ready_for_transfer` until the gate confirms at minimum:

- Seller verification = verified;
- exact Asset Schedule hash exists;
- Seller bilateral acceptance exists;
- Buyer bilateral acceptance exists;
- payment = paid;
- IP review = clear or disclosed exception;
- Malware review = clear;
- third-party/open-source disclosure completed or not applicable;
- handover = accepted;
- credential rotation = complete or not applicable;
- tax/stamp-duty review has been assessed;
- personal-data transfer has a recorded decision;
- if a Data Transfer Addendum is required, its hash plus bilateral Seller/Buyer acceptance exist; and
- no transaction hold is active.

### Ownership truth boundary

Even after all legal/commercial gates are satisfied, `ownership_transfer_status = completed` is rejected unless:

1. the actual `apps.owner_id` already equals the Buyer;
2. the truth gate still passes;
3. an immutable ownership-transfer reference is recorded; and
4. an effective transfer timestamp exists.

Batch 115 does **not** implement the cross-table app-ownership mutation itself. That requires a separately reviewed atomic ownership-transfer adapter so related project assets, permissions and records cannot become inconsistent.

A post-completion refund or chargeback is not treated as an automatic IP re-transfer. The completed ownership evidence remains immutable and any dispute/reversal requires a separate lawful workflow.

## 7. Database exposure and RLS

All five runtime tables enable RLS:

- `legal_document_versions`;
- `legal_acceptance_events`;
- `privacy_incidents`;
- `privacy_incident_audit`; and
- `app_sale_transactions`.

`anon` and `authenticated` receive no direct table privileges. Server-side LANERIQ code uses the existing server-only Supabase admin client. The only SECURITY DEFINER RPC introduced in the exposed `public` schema is the transaction evaluator, and EXECUTE is revoked from PUBLIC, `anon` and `authenticated`, then granted only to `service_role`.

Private trigger/helper functions are kept in the `private` schema and are not user-callable.

## 8. Zero-new-cost staging

This architecture does not require a paid KYC provider, commercial e-signature SaaS, paid tax engine, escrow provider or new Supabase development branch.

Current infrastructure is reused. Paid/regulatory services can be added later only when the actual legal role, transaction risk, customer tier or statutory obligation requires them.

Zero-new-cost staging does not mean taxes, stamp duty, legal review, regulatory filings or other real-world obligations can be ignored when they become applicable.

## 9. Production activation gate

Batch 115 is not Production-complete merely because its code builds.

Before legal runtime is declared LIVE:

1. PR #237 legal framework must be integrated;
2. PR #244 legal operations must be integrated;
3. Batch 115 must rebase/realign to then-current `main`;
4. migrations must pass CI and controlled database application;
5. Supabase Security Advisor must be rerun after migration;
6. qualified legal review must approve each binding document;
7. exact approved documents must be hashed and inserted as legal versions;
8. only approved versions may be promoted to ACTIVE;
9. browser/runtime acceptance behavior must be verified; and
10. GitHub main exact SHA = Vercel Production exact SHA = Runtime verified SHA must be reconciled by Production Release Control.

Until those conditions are satisfied, the correct status is **CODE / ARCHITECTURE READY**, not `100 LIVE`.
