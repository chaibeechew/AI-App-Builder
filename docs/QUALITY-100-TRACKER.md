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
| CI / Structural Quality | 96 | 100 | ✅ 100 CODE | Brand → Release → Security → Credits → Pro → Game Commercial → Versions → Database → Memory → Brand Kit → Workflows → Self-Heal → Modify → Idea → Templates → Multilingual → Account/Session → Runtime → Nonprod → 100-point gate → Next.js Build all pass |
| Security / Ownership | 91 | 100 | ✅ 100 CODE | Critical create/modify/data/workflow/checkout/store/publish paths owner-bound; service-role finance; RLS + client secret scan |
| Credits System | 86 | 100 | ✅ 100 CODE | Service-role mutation only, row locks, idempotent charge/refund, exact matching refund, create reservation recovery, exact-project access |
| Pro Mode | 88 | 100 | ✅ 100 CODE | Expiry-bound entitlement, service-only grant, owned Pro workspace, game double-gate before credit/entitlement consumption |
| Game commercial policy | 93 | 100 | ✅ 100 CODE | Pro-only, no buyout, continuing 5% game-profit share survives Pro expiry; policy/API/UI/README locked by CI contract |
| Version History / Undo | 90 | 100 | ✅ 100 CODE | Atomic service-only rollback RPC, owner row lock, append-only history, expected-current stale protection, replay-safe request IDs |
| Database / Supabase | 89 | 100 | ✅ 100 CODE | RLS-enabled live; DB-level bounded schema/records; dangerous public privileges removed; no-code safety mirrored in CHECK constraints |
| Project Memory | 87 | 100 | ✅ 100 CODE | Owner + owned-app RLS, bounded canonical memory, secrets/private-reuse blocked, Generate persists and Modify consumes memory |
| Brand Kit | 84 | 100 | ✅ 100 CODE | Authenticated owner-only persistence, DB-enforced colors/lengths/HTTPS logo, Generate consumes current kit, Project Memory snapshots identity for Modify |
| Automation / Workflows | 81 | 100 | ✅ 100 CODE | Supported trigger/action allowlists, app/workflow/owner RLS, stable idempotency keys, Safe Test zero side effects, timeout + critical fail-closed, incomplete actions never reported successful |
| AI Self-Test / Self-Heal | 90 | 100 | ✅ 100 CODE | Dedicated create/modify regression + repair gate; bounded self-heal only improves or preserves accepted quality; full CI/build pass |
| AI Modify | 86 | 100 | ✅ 100 CODE | Request-level replay, expected-version stale guard before AI/credits, precise-edit version binding, atomic persistence, refund/recovery contract |
| AI Idea Planning | 88 | 100 | ✅ 100 CODE | Shared deterministic readiness contract; vague ideas fail closed, focused questions bounded, Voice/zero-cost/orchestrator use one gate |
| Templates | 85 | 100 | ✅ 100 CODE | Canonical 3,000-template catalog, safe lookup/search/trending, responsive App + Website metadata, inspiration-only application through Planning |
| Multilingual system | 74 | 100 | ✅ 100 CODE | Canonical 10-language core UI catalog with 10/10 key coverage, fallback, persistence, dynamic DOM/attributes and semantic lang/dir |
| Account / Session Safety (code) | 82 | 100 | ✅ 100 CODE | Same-origin return-path sanitizer, server getUser guard, protected no-store, fail-closed local logout, private session cleanup and stale-page revalidation |
| Email OTP | 86 | 86 | 🌐 LIVE PENDING | Code/flow can be verified; continuing real email reliability is external |
| Logout / Account mobile UX | 82 | 82 | 📱 MOBILE PENDING | Code/session safety is 100 separately; visible logout placement, touch behavior and real iPhone back-stack feel need device confirmation |
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

## Main CI contract

The `LANERIQ AI 100 CI` workflow currently requires these checks in order:

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
11. Brand Kit contract tests
12. Automation and Workflows contract tests
13. AI Self-Test and Self-Heal contract tests
14. AI Modify contract tests
15. AI Idea Planning contract tests
16. Templates contract tests
17. Multilingual contract tests
18. Account and Session Safety contract tests
19. Runtime reliability contract tests
20. Non-production 100 product contract tests
21. 100-point structural readiness gate
22. Next.js production build

Production promotion remains a separate, explicitly approved action.

## Completed evidence

### 1. Brand identity & consistency — 100 CODE
- Canonical customer brand is `LANERIQ AI`, product line `Build App Web & Game`, descriptor `3-in-1 AI Creation Platform`, tagline `Create Anything. From One Idea.` and powered-by identity `SoolenAI`.
- Repository/package/CI identity is aligned and `scripts/product-brand-tests.mjs` prevents regression.

### 2. CI / Structural Quality — 100 CODE
- Main CI fails closed through dedicated commercial, security, data, memory, Brand Kit, workflow, AI quality, planning, template, multilingual, account/session, runtime and release gates before the Next.js production build.
- Repository 100 does not promote Production automatically.

### 3. Security / Ownership — 100 CODE
- Critical routes authenticate server-side and owner-bind project data.
- Financial mutation and Professional modification persistence are service-role/server-only where required.
- Client components are scanned for server secrets; data records remain protected by RLS.

### 4. Credits System — 100 CODE
- Credit charges/refunds and creation reservations are row-locked, request-bound and replay safe.
- Failed creates and failed AI modifications have bounded recovery/refund paths.
- Customers cannot directly mutate privileged financial ledgers/RPCs.

### 5. Pro Mode — 100 CODE
- Professional entitlement uses server-stored expiry, service-only granting and no auto-renew.
- Professional project access is expiry-bound; Game creation is double-gated before credit/entitlement consumption.

### 6. Game commercial policy — 100 CODE
- Game creation is Professional-only and has no buyout.
- Commercialized LANERIQ AI-generated games carry a continuing 5% share of **game profit**, not revenue, and this obligation survives Pro expiry.
- API, policy, UI, README and automated tests carry the same rule.

### 7. Version History / Undo — 100 CODE
- Rollback uses a service-only PostgreSQL transaction with owned-app row locking.
- Every rollback appends a new version, uses expected-current stale protection and stable replay-safe request IDs.
- Legacy direct-pointer rollback is disabled; live Supabase transaction verification and full CI passed.

### 8. Database / Supabase — 100 CODE
- Public base tables are RLS-enabled live.
- No-code schema and durable record limits are enforced both in API code and database CHECK constraints.
- Customer roles cannot use `TRUNCATE`, `TRIGGER` or `REFERENCES` on public base tables.
- Database/Supabase dedicated gate, Runtime, Non-production, structural 100 gate and Next.js build pass together.

### 9. Project Memory — 100 CODE
- Memory is exact-project/owner scoped, no-store, request bounded and database constrained.
- Canonical memory stores bounded brand, visual, user, workflow, industry and customer-owned reference placement preferences while blocking secret/private-reuse data.
- Generate persists canonical Project Memory; Modify loads the exact project's memory brief into the AI prompt and merges accepted changes back.
- Live database constraints/RLS and full CI passed.

### 10. Brand Kit — 100 CODE
- Brand Kit reads/saves authenticate and bind the exact `user_id`; application and DB both bound field lengths/colors, and Logo references must be HTTPS.
- `anon` has no Brand Kit table access; authenticated access is limited to SELECT/INSERT/UPDATE under owner RLS.
- Generate consumes the current account Brand Kit and snapshots it into the project's canonical Project Memory.
- Modify consumes that saved project snapshot rather than silently applying later global Brand Kit edits.
- Brand Kit dedicated gate and full CI passed.

### 11. Automation / Workflows — 100 CODE
- Workflow creation accepts only supported triggers (`form_submitted`, `appointment_created`, `order_created`) and supported actions (`save_crm`, `save_order`, `notify_team`, `send_email`, `send_sms`, `send_whatsapp`, `calendar`).
- Workflow names/config/actions are bounded, credential-like config keys are stripped in API code and rejected by live database functions/CHECK constraints.
- Live migration `20260901111658_harden_workflow_runtime_contract` mirrors the action/trigger/payload limits in PostgreSQL.
- `app_workflows` RLS binds the row to the authenticated owner and an App actually owned by that user.
- `workflow_runs` RLS additionally binds `workflow_id` to the same owned App; `workflow_records` also requires actual owned-App membership.
- `anon` has no direct access to workflow definitions, runs or records. Authenticated privileges are reduced to the operations required by the runtime.
- Every workflow execution requires a stable idempotency key. The unique `(owner_id, workflow_id, idempotency_key)` database index blocks concurrent duplicates; a duplicate `started` run is never re-executed with the same key.
- Safe Test short-circuits all supported side-effecting actions before CRM/order writes, notifications, email, SMS, WhatsApp or calendar calls, so a successful Safe Test has no customer-data or external-service side effects.
- External provider requests are time-bounded. Failure messages redact bearer/basic authorization material.
- Missing required input, unsupported/incomplete actions and unconfigured integrations are recorded as `partial`, not falsely `completed`.
- A configured critical action that does not complete stops the workflow and records `failed`; non-critical failures are preserved in partial execution history.
- Live verification confirmed valid supported actions/payloads pass while unsupported actions, secret config and secret payload keys are rejected.
- Supabase security advisor reports no new workflow database/RLS/function warning after hardening; the separate Auth leaked-password-protection warning remains outside this score.
- The dedicated Automation/Workflows gate, Runtime gate, Non-production gate, structural 100-point gate and Next.js production build all pass together in CI.

This is a **100/100 Automation / Workflows code + database-contract score**. Live delivery reliability for third-party Email/SMS/WhatsApp/Calendar providers remains external evidence and is not falsely counted as code certainty.

### 12. AI Self-Test / Self-Heal — 100 CODE
- Create and Modify quality checks share bounded regression/repair rules instead of treating any AI repair as automatically better.
- Self-heal is accepted only under the defined quality contract and the dedicated `test:self-heal` gate runs before Runtime and production build.
- Full CI passed with Self-Heal, Runtime, Non-production, structural 100 and Next.js production build together.

### 13. AI Modify — 100 CODE
- Precise Editor and Professional Workspace bind modifications to the version the user actually loaded; stale expected-version requests fail before AI invocation or credit consumption.
- Stable request IDs provide request-level replay behavior so retries do not re-apply a different AI result.
- Concurrent persistence returns the actual saved winner, and successful modifications remain append-only/atomic through the service persistence contract.
- Failed modification paths keep bounded credit recovery/refund behavior.
- Dedicated Modify gate, live Supabase persistence contract checks and full CI passed.

### 14. AI Idea Planning — 100 CODE
- Shared deterministic readiness rules replaced message-length and default-audience shortcuts.
- A long but vague idea cannot self-approve; AI/model `readyToBuild:true` is advisory and the system recomputes readiness from user-confirmed requirements.
- Voice, zero-cost fallback and `/api/orchestrate` use the same planning contract; insufficient requirements return bounded focused questions and `IDEA_NEEDS_DETAILS` rather than calling Generate.
- Corrections can remove explicitly rejected old requirements instead of only accumulating inferred features.
- Full CI run `33505298731` passed Idea Planning, Self-Heal, Modify, Runtime, Non-production, structural 100 and Next.js Build.

### 15. Templates — 100 CODE
- Canonical catalog is exactly 50 industries × 12 archetypes × 5 visual directions = 3,000 unique bounded templates.
- Template API, list and detail all use the same versioned schema with safe ID lookup, bounded search/filter/trending and `no-store` responses.
- Every template declares App + Website targets, mobile-first tablet/desktop responsiveness and `inspiration-only` application with direct copying/third-party branding preservation disabled.
- Template detail no longer uses legacy array indexing or calls `/api/generate` directly; it returns through the normal AI Planning gate.
- Full CI run `33505960806` passed Templates and the complete release/build chain.

### 16. Multilingual system — 100 CODE
- One canonical i18n catalog defines the 10 supported UI locales: English, Simplified Chinese, Traditional Chinese, Bahasa Melayu, Bahasa Indonesia, Japanese, Korean, Thai, Vietnamese and Spanish.
- Every declared critical Builder/Auth/Templates UI key, Hero field and tracked placeholder has complete 10/10 non-empty locale coverage; missing keys fail the dedicated gate.
- Unsupported/browser locales normalize deterministically with safe English fallback.
- Runtime persists the selected language, writes semantic HTML `lang` + `dir`, handles dynamic React text such as resend countdowns, and translates tracked `placeholder`, `aria-label` and `title` attributes.
- Full CI run `33506377239` passed Multilingual and the complete release/build chain.

This is a **100/100 multilingual code/runtime-contract score**. Real phone text wrapping, touch layout and visual fit remain MOBILE PENDING rather than being inferred from CI.

### 17. Account / Session Safety — 100 CODE
- Shared return-path policy rejects external URLs, protocol-relative URLs, backslash/browser-normalization tricks, Auth loops, control characters and oversized redirect values.
- Server proxy canonicalizes externally supplied `/auth?next=` before the Auth page can use it, preserves only safe internal protected return paths and fails closed when authenticated identity cannot be confirmed.
- Protected project/account responses use `private, no-store` and `Pragma: no-cache` to reduce reusable sensitive browser cache after sign-out.
- Server protection uses Supabase `auth.getUser()` rather than trusting client-stored `getSession()` data for authorization.
- Logout explicitly uses current-session `signOut({ scope: "local" })`; navigation happens only after successful sign-out, uses history replacement, and a failed logout is shown as still-active rather than falsely reported successful.
- Successful `SIGNED_OUT` clears project idea/reference/template/analytics sessionStorage owned by the prior browser session while intentionally preserving non-sensitive language preference.
- Account state revalidates on auth events, browser `pageshow`/BFCache restoration and returning to a visible tab; stale signed-out protected pages hard-redirect through the safe Auth return path.
- Auth/account listeners and browser event listeners are unsubscribed/removed on unmount.
- Current Supabase Auth/SSR guidance and 2026 changelog were checked before the hardening; no relevant hosted-auth breaking change invalidates this contract.
- Full CI run `33507143274` passed Account/Session Safety, Multilingual, Templates, Idea, Modify, Self-Heal, Runtime, Non-production, structural 100 and Next.js Build.

This is a **100/100 account/session code-security score**. The visible Logout button placement, touch target feel and real iPhone history behavior remain separately listed as MOBILE PENDING until device testing.

## Working rule

Complete repository-verifiable areas one by one. Do not raise a LIVE/MOBILE item to 100 without the required real-world evidence. Skip phone-only checks until device testing resumes.
