# LANERIQ AI — Quality 100 Tracker

This tracker separates repository-verifiable quality from evidence that requires a real phone, live external provider, store submission, or production traffic.

**100/100 means every defined criterion for that scope is passing. It is not a guarantee of zero bugs, zero vulnerabilities, or perfect real-world behavior.**

## Status legend

- ✅ **100 CODE** — all defined repository/CI criteria pass.
- 🟡 **IN PROGRESS** — repository-verifiable gaps remain.
- 📱 **MOBILE PENDING** — must be confirmed on a real phone; skipped until device testing.
- 🌐 **LIVE PENDING** — requires a live external provider, deployment, payment, renderer, multiplayer service, or store.

## Scoreboard

| Area | Baseline | Current | Status | Evidence / next gate |
|---|---:|---:|---|---|
| Brand identity & consistency | 88 | 100 | ✅ 100 CODE | Canonical LANERIQ AI contract, Powered by SoolenAI, renamed repo/package/CI, automated brand regression test |
| CI / Structural Quality | 96 | 100 | ✅ 100 CODE | Brand → Release → Security → Credits → Pro → Game Commercial → Versions → Database → Memory → Runtime → Nonprod → 100-point gate → Next.js Build all pass |
| Security / Ownership | 91 | 100 | ✅ 100 CODE | Critical create/modify/data/workflow/checkout/store/publish paths owner-bound; service-role finance; RLS + client secret scan |
| Credits System | 86 | 100 | ✅ 100 CODE | Service-role mutation only, row locks, idempotent charge/refund, exact matching refund, create reservation recovery, exact-project access |
| Pro Mode | 88 | 100 | ✅ 100 CODE | Expiry-bound entitlement, service-only grant, owned Pro workspace, game double-gate before credit/entitlement consumption |
| Game commercial policy | 93 | 100 | ✅ 100 CODE | Pro-only, no buyout, continuing 5% game-profit share survives Pro expiry; policy/API/UI/README locked by CI contract |
| Version History / Undo | 90 | 100 | ✅ 100 CODE | Atomic service-only rollback RPC, owner row lock, append-only history, expected-current stale protection, replay-safe request IDs, legacy pointer rollback disabled |
| Database / Supabase | 89 | 100 | ✅ 100 CODE | All public tables RLS-enabled live; DB-level bounded schema/records; dangerous TRUNCATE/TRIGGER/REFERENCES removed from customer roles; no-code safety mirrored in CHECK constraints |
| Project Memory | 87 | 100 | ✅ 100 CODE | Owner + owned-app RLS, bounded canonical memory, secrets/private-reuse blocked, create persists brand/visual/industry/reference memory, Modify consumes memory brief |
| Brand Kit | 84 | 84 | 🟡 IN PROGRESS | Verify persistence and generation/modify consumption |
| Automation / Workflows | 81 | 81 | 🟡 IN PROGRESS | Verify idempotency, timeouts, safe-test, critical-failure behavior |
| AI Self-Test / Self-Heal | 90 | 90 | 🟡 IN PROGRESS | Verify create/modify quality regression and repair gates |
| AI Modify | 86 | 86 | 🟡 IN PROGRESS | Repository runtime can reach 100; live provider quality remains separate |
| AI Idea Planning | 88 | 88 | 🟡 IN PROGRESS | Structural planner quality can reach 100; subjective live quality remains separate |
| Templates | 85 | 85 | 🟡 IN PROGRESS | Verify schema, routes, safe application, responsive metadata |
| Multilingual system | 74 | 74 | 🟡 IN PROGRESS | Reach static translation-key/coverage 100; visual phone layout remains MOBILE PENDING |
| Email OTP | 86 | 86 | 🌐 LIVE PENDING | Code/flow can be verified; real email delivery already tested but continuing live reliability is external |
| Logout / Account | 82 | 82 | 📱 MOBILE PENDING | Code hard-redirect can be verified; visible placement/interaction needs device confirmation |
| Mobile UI / UX | 68 | 68 | 📱 MOBILE PENDING | Skip until iPhone testing |
| Mobile Performance | 58 | 58 | 📱 MOBILE PENDING | Skip until iPhone/network profiling |
| Voice Idea | 66 | 66 | 📱 MOBILE PENDING | Browser microphone permissions/device behavior required |
| SMS login | 35 | 35 | 🌐 LIVE PENDING | Requires configured live SMS provider |
| AI App generation E2E | 72 | 72 | 🌐 LIVE PENDING | Requires successful live provider create → save → preview proof |
| AI Website generation E2E | 76 | 76 | 🌐 LIVE PENDING | Requires successful live provider build and preview proof |
| App + Website simultaneous E2E | 75 | 75 | 🌐 LIVE PENDING | Requires complete live generation evidence |
| Upload Ref | 80 | 80 | 📱 MOBILE PENDING | Core code can be checked; mobile picker/camera behavior needs device |
| Image Studio | 80 | 80 | 🌐 LIVE PENDING | Requires real provider output evidence for full live score |
| AI Video Generator | 58 | 58 | 🌐 LIVE PENDING | Requires real renderer job/output proof |
| AI Avatar Creator | 55 | 55 | 🌐 LIVE PENDING | Requires real provider/render proof |
| Game Creator runtime | 62 | 62 | 🌐 LIVE PENDING | Requires complete generated game runtime proof |
| Multiplayer / 5v5 | 35 | 35 | 🌐 LIVE PENDING | Requires real multiplayer backend/session evidence |
| Web Publish | 72 | 72 | 🌐 LIVE PENDING | Requires complete live publish E2E |
| Apple App Store | 45 | 45 | 🌐 LIVE PENDING | Requires real submission/review evidence |
| Google Play | 45 | 45 | 🌐 LIVE PENDING | Requires real submission/review evidence |
| Vercel deployment stability | 65 | 65 | 🌐 LIVE PENDING | External quota/build behavior cannot be proven by repository CI alone |
| Production Readiness | 64 | 64 | 🌐 LIVE PENDING | Production remains intentionally held pending real-world evidence |

## Completed evidence

### 1. Brand identity & consistency — 100 CODE

- Repository renamed to `chaibeechew/LANERIQ-AI`.
- Canonical customer brand is `LANERIQ AI`.
- Product line is `Build App Web & Game`.
- Descriptor is `3-in-1 AI Creation Platform`.
- Tagline is `Create Anything. From One Idea.`.
- Powered-by identity is `SoolenAI`.
- `package.json` package name is `laneriq-ai`.
- GitHub Actions workflow is `LANERIQ AI 100 CI`.
- `scripts/product-brand-tests.mjs` enforces the brand contract in CI.

### 2. CI / Structural Quality — 100 CODE

The main CI requires all of the following to pass in order:

1. Migration filename validation
2. LANERIQ AI brand regression tests
3. Release policy regression tests
4. Security and ownership contract tests
5. Credits and entitlement contract tests
6. Pro Mode contract tests
7. Game commercial policy contract tests
8. Version History and Undo contract tests
9. Database and Supabase contract tests
10. Project Memory contract tests
11. Runtime reliability contract tests
12. Non-production 100 product contract tests
13. 100-point structural readiness gate
14. Next.js production build

Production promotion remains a separate, explicitly approved action.

### 3. Security / Ownership — 100 CODE

The security contract now fails closed unless all defined repository-verifiable controls remain present:

- Generate, Modify, Publish and Quality routes authenticate server-side and bind app ownership.
- Records CRUD validates owned project context, owner-scopes rows, bounds records/fields/value length and protects conflicting edits.
- No-code Database checks project ownership before model access, rejects credential-like fields and writes owner-bound models.
- Bootstrap checks owned app + current version and owner-binds generated modules, workflows, assets and video projects.
- Workflow execution verifies owned app + workflow + run history, bounds actions, uses timeouts and supports replay-safe idempotency.
- Monetization Checkout reads authoritative owner-scoped offers, requires secure redirect origin and owner-scopes checkout logs.
- Store approval and publish requests verify the owned exact-version chain before any admin-client mutation.
- Entitlement, credit consume/refund and project binding RPCs remain service-role only.
- Professional modification persistence remains service-only, expected-version bound and replay safe.
- Legacy authenticated financial mutation RPCs are explicitly revoked.
- Client components are scanned for server secrets and non-public environment variables.
- App data records are protected by RLS ownership policies.

This is a **100/100 code-contract score**, not a claim of zero possible security vulnerabilities in real-world operation.

### 4. Credits System — 100 CODE

The dedicated credits/entitlement gate requires all defined financial safety contracts to remain present:

- Privileged financial mutation RPCs are called only through the server admin client and are granted to `service_role` only.
- Customers may read their own credit/account state, but authenticated clients cannot insert/update/delete/truncate credit ledgers directly.
- Credit transaction idempotency is enforced by `(user_id, request_id, type)` uniqueness.
- AI credit charges require a positive bounded amount and request id, row-lock the balance, detect replay, and fail closed on insufficient balance.
- Refunds require the original matching AI charge, must exactly match its amount, and are replay safe.
- Create entitlement reservations row-lock per-user usage state and block concurrent different creation requests.
- Project access binding requires the exact matching creation reservation and exact owned project.
- Failed creates restore standard project credits or the free-first-project claim only when safe and unbound.
- Modify entitlement is exact-project owner-bound across promotion, standard and professional tiers.
- Legacy authenticated financial mutation RPCs are explicitly revoked.
- Generate and Modify use the server finance layer; Generate includes project binding/create recovery and Modify includes failed-AI-credit refund handling.

This is a **100/100 code-contract score**; it does not substitute for live payment/provider reconciliation evidence.

### 5. Pro Mode — 100 CODE

The Pro Mode contract now requires all defined repository-verifiable access controls to remain present:

- Professional price is US$68 for 365 days with no automatic renewal in the product contract.
- Pro is considered active only while the server-stored `pro_valid_until` timestamp is in the future; expired accounts downgrade safely.
- Pro grants are bounded and callable only by `service_role`; customers cannot grant themselves Professional access.
- Renewals extend from the later of the current expiry or now, so valid remaining access is not shortened.
- Professional project access stores/uses an expiry and refuses binding when account Pro has already expired.
- Pro Workspace authenticates the user, verifies project ownership and shows a locked state when Professional access is inactive.
- Game creation is double-gated: the dedicated Game API requires active Pro and the main Generate route also requires active Pro plus the trusted internal Game gateway.
- The Game Pro gate executes before App Builder entitlement or AI-credit consumption, so rejected Standard game attempts are not charged by the normal generation path.
- Normal-mode Game requests clearly expose the Become Pro route rather than pretending Game creation is available in Standard.

This is a **100/100 Pro entitlement/code score**. Activation through a real payment provider remains separate LIVE evidence.

### 6. Game commercial policy — 100 CODE

The dedicated Game commercial gate now requires all defined repository-verifiable commercial rules to remain aligned:

- Game creation is Professional-only in both the dedicated Game API and the main Generate gateway.
- Game projects cannot purchase or remove the obligation through a buyout license; non-game buyout policy stays separate.
- Commercialized LANERIQ AI-generated games carry a continuing 5% share of **game profit**, not gross revenue.
- The continuing 5% game-profit-share obligation remains after Professional access ends.
- Customer ownership of the generated game remains preserved while the continuing commercial obligation remains.
- Product policy and Game Creator policy both require production legal terms to define permitted cost deductions and profit calculation before launch.
- The Game API returns the same commercial terms and immutable Game headers for access tier, buyout availability and profit share.
- The customer-facing Game Pro dialog and Game Builder commercial notice explicitly state Pro-only, no buyout, 5% of game profit and continuation after Pro expiry.
- README and automated contract tests carry the same terms, and CI fails if they drift or if the 5% rule is mislabeled as revenue share.

This is a **100/100 repository commercial-policy score**. Final jurisdiction-specific legal drafting and real commercial accounting remain separate production/legal work.

### 7. Version History / Undo — 100 CODE

Version history and rollback are now protected as an append-only, concurrency-safe project history flow:

- `(app_id, version_no)` remains unique, while saved AI modifications and rollbacks serialize on the owned app row.
- Rollback runs through the service-only `server_rollback_app_version` database RPC using one PostgreSQL transaction.
- The RPC locks the exact owned app row before reading/writing rollback state, so concurrent project changes cannot silently overwrite one another.
- Every rollback copies the selected historical specification into a **new** version and only then advances `current_version_id`; historical versions are not deleted or rewritten.
- The client supplies the `expectedCurrentVersionId`; if the project changed after Version History was loaded, the rollback fails closed with a stale-version conflict.
- A stable request ID is persisted through retry and stored as `source_request_id`, making repeated rollback requests replay-safe instead of creating duplicate versions.
- The old direct-pointer POST rollback path is disabled, preventing callers from bypassing the append-only rollback contract.
- The Version History UI clearly states that restoration creates a new version and that stale rollback attempts are blocked.
- The migration was applied to the live LANERIQ AI Supabase project, and a transaction-scoped live verification proved: one rollback creates exactly one new version, replay creates no duplicate, and stale expected-current requests are rejected; the verification transaction was rolled back so no test project remained.
- The dedicated Version History contract gate, Runtime gate, Non-production gate, structural 100-point gate and Next.js production build all pass together in CI.

This is a **100/100 repository + database-contract score**. It does not claim that every future live customer interaction is immune to network/device failure; retry handling is designed to make those failures safe.

### 8. Database / Supabase — 100 CODE

The database runtime now has live database evidence in addition to route-level validation:

- Every current public base table in the live LANERIQ AI Supabase project has Row Level Security enabled.
- `apps`, `app_versions`, `app_backend_models` and `app_data_records` have owner-scoped policies that bind customer data to `auth.uid()` and owned projects.
- No-code Database schemas remain limited to safe supported field types, a maximum of 30 entities, 80 fields per entity, 100 relationships and 8 rollback snapshots, while credential-like fields are rejected.
- A live database CHECK now calls `app_backend_schema_is_safe`, so the critical schema rules cannot be bypassed by writing directly to the table; the schema payload is also bounded to 2 MiB.
- Durable App records remain limited to 24 supported fields and 2,000 characters per string value in the API, with stale-update protection through `expectedUpdatedAt`.
- A live database CHECK now calls `app_record_json_is_bounded`, rejecting more than 24 fields, nested JSON values, oversized strings, invalid field names and oversized payloads even if the API layer is bypassed.
- Existing 64 KiB record-object storage limits and owner/project RLS remain in force.
- `TRUNCATE`, `TRIGGER` and `REFERENCES` privileges were removed from `anon` and `authenticated` across all public base tables; this matters because RLS does not protect `TRUNCATE`.
- Live validation proved safe schema/records are accepted, credential-like schema fields are rejected, nested records are rejected, 25-field records are rejected, >2,000-character values are rejected, and dangerous public-table privileges are now zero.
- Supabase security advisor reports no new database/RLS/function warning from this hardening; its remaining warning is an Auth leaked-password-protection setting and is tracked separately from the database runtime score.
- The dedicated Database/Supabase contract gate, Runtime gate, Non-production gate, structural 100-point gate and Next.js production build all pass together in CI.

This is a **100/100 database runtime/code-contract score**. It does not replace live load testing, backup-restore drills or Auth-specific production configuration.

### 9. Project Memory — 100 CODE

Project Memory now has an end-to-end repository and live-database contract instead of being only a storage table:

- The Memory API authenticates with `auth.getUser()`, verifies the exact owned App before reads/writes, owner-scopes every `project_memory` lookup and returns memory responses with `Cache-Control: no-store`.
- Memory update requests are bounded before and after JSON parsing, and the sanitizer limits preference keys, string lengths, media/reference entries, learned-from entries, industry structure and publishing declarations.
- Credential-like keys such as passwords, secrets, tokens, API keys, credentials and private/auth keys are removed by the application sanitizer and rejected by the live database CHECK.
- Raw private assets are explicitly marked non-reusable across customers; Project Memory stores only bounded project-specific preference/reference metadata rather than granting cross-customer reuse permission.
- Brand, visual, user, workflow, industry, content and customer-owned media/reference placement preferences are normalized into one canonical memory shape.
- Initial Generate writes canonical Project Memory containing project name, saved Brand Kit preferences, visual/theme/wallpaper preferences, industry structure, customer-owned media placements, self-heal result and build timestamp.
- Modify loads the exact project's `project_memory`, builds a bounded `PROJECT MEMORY` brief and injects it into the AI modification prompt before generation; the current customer instruction remains authoritative when it intentionally changes an older preference.
- After an accepted modification, the project memory is merged and updated with the newest visual direction, modification instruction, precise target and self-heal state.
- The live database `project_memory_json_safe_check` limits memory to 128 KiB, rejects unknown top-level keys, secret-like keys, excessive nesting/arrays and unsafe preference structures.
- Live RLS requires both `owner_id = auth.uid()` and actual ownership of the referenced App; `anon` has no direct table access, while authenticated access is limited to SELECT/INSERT/UPDATE/DELETE and excludes TRUNCATE/TRIGGER/REFERENCES.
- Live verification confirmed legacy/canonical safe memory is accepted while secret keys, unknown keys and >30 media entries are rejected.
- Bootstrap Database policy text was aligned with the hardened Database/Supabase CHECK so automatic module synchronization cannot regress because of stale policy wording.
- The dedicated Project Memory contract gate, Runtime gate, Non-production gate, structural 100-point gate and Next.js production build all pass together in CI.

This is a **100/100 Project Memory code + database-contract score**. It does not mean private customer assets can be learned across customers; that behavior remains explicitly prohibited.

## Working rule

Complete repository-verifiable areas one by one. Do not raise a LIVE/MOBILE item to 100 without the required real-world evidence. Skip phone-only checks until device testing resumes.
