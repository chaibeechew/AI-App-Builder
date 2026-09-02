# LANERIQ AI — Production Evidence Ledger

Verified date: **2026-09-02 (Asia/Kuala_Lumpur)**

This ledger records what has actually been proven. It intentionally separates repository/code checks, automated browser emulation, physical-device evidence, provider evidence and official store evidence.

## Evidence levels

| Level | Meaning | Can close physical-device/provider/store rows? |
|---|---|---|
| `CODE` | Repository contract/build/static/dynamic code checks pass | No |
| `PRODUCTION_HTTP` | Real Production URL/API is exercised over the network | Only transport/API rows |
| `BROWSER_EMULATION` | Real Production is rendered/interacted with using automated browser engines and phone descriptors | No — stronger than code, but not a physical iPhone/Android device |
| `PHYSICAL_DEVICE` | Real hardware/browser/permission/input/network behavior is observed | Yes for the matching device row |
| `LIVE_PROVIDER` | Real external provider job/message/render/relay succeeds | Yes for the matching provider row |
| `OFFICIAL_STORE` | Real developer account/signing/submission/review evidence exists | Yes for the matching store row |

A higher score must never be inferred from a lower evidence level when the row explicitly requires physical hardware, a live provider or an official store.

## Main CI / build evidence

Verified application commit before this evidence-ledger-only documentation change:

- Main commit: `a1a995cb72990477d96498cca2f660561a860291`
- Main CI: run **#638**, run ID **33571770580**
- Result: **SUCCESS**
- Main validation job completed **59/59 named validation/build/report steps successfully**, including:
  - zero-cost provider safety
  - zero-cost dynamic engine execution
  - security/ownership
  - database/Supabase contracts
  - AI App / Website / combined internal E2E
  - Mobile UI
  - Mobile Performance
  - Mobile Readiness diagnostics
  - Voice Idea
  - Production public-surface contract
  - Runtime reliability
  - 100-point structural readiness gate
  - Next.js Production build

Evidence level: **CODE**.

## Current verified Vercel Production deployment

- Project: `laneriq-ai`
- Project ID: `prj_Q6mR7lmYGGKCW0ARu2Fgm9Pyzfcl`
- Production deployment: `dpl_Dzw9rSiuaJi2LJ4nCVzB2cbRcnyZ`
- Source commit: `a1a995cb72990477d96498cca2f660561a860291`
- State: **READY**
- Primary alias: `https://laneriq-ai.vercel.app/`
- `/mobile-readiness`: real Production **HTTP 200**
- The diagnostics page is `noindex,nofollow` and remains publicly reachable without an application-auth redirect.

Evidence level: **PRODUCTION_HTTP**.

## Production stability — 1000 cycles × 9 surfaces

Isolated QA evidence:

- Workflow: `LANERIQ AI QA Production 9-Surface Stability 1000`
- Run ID: **33571869566**
- Job ID: **100067361804**
- Conclusion: **SUCCESS**
- Target: `https://laneriq-ai.vercel.app`
- Cycles: **1000**
- Surfaces per cycle: **9**
- Total requests: **9000**

Surfaces:

1. `/`
2. `/auth`
3. `/api/templates?mode=meta`
4. `/api/soolenai/capabilities`
5. `/api/apps`
6. `/mobile-readiness`
7. `/robots.txt`
8. `/sitemap.xml`
9. `/ai-app-game-website-builder`

Final result:

| Metric | Result |
|---|---:|
| HTTP 200 | 8000 |
| Expected protected HTTP 401 | 1000 |
| Crash | 0 |
| Network error | 0 |
| Server 5xx | 0 |
| Average latency | 68 ms |
| p50 | 48 ms |
| p95 | 131 ms |
| p99 | 171 ms |
| Max | 684 ms |

The 1000 protected 401 responses are the expected signed-out behavior of `/api/apps`; the runner verifies the authenticated-API error contract rather than treating that status as failure.

Every cycle also parses `/api/soolenai/capabilities` and verifies that Production remains in zero-cost/fail-closed mode with approved zero-cost text routing, zero external spend policy, the eight free core capabilities ready, and non-free capabilities not falsely reported as free-ready.

Evidence level: **PRODUCTION_HTTP**. This proves Production transport/API stability; it does not prove physical-device UX, microphone/Photos behavior, authenticated Generate→Save→Preview, premium renderer output, live multiplayer or store submission.

## Mobile readiness diagnostics

Production route: `/mobile-readiness`

The page is designed to collect local evidence without requesting privacy-sensitive permissions. It checks browser/device capability signals including viewport, safe-area support, touch/coarse-pointer behavior, horizontal overflow, 44px touch targets, 16px input sizing, visual viewport, photo/camera picker capability, microphone API availability, voice/PWA capability signals and report export.

The page does **not** call `getUserMedia`, does not query permission state, does not upload the report, and does not persist the device evidence in browser storage. The report explicitly states whether permission prompts were triggered.

Current evidence level: **PRODUCTION_HTTP + CODE**. A physical iPhone report is still required before physical-device rows can be closed.

## Mobile browser automation

A cross-engine Production browser QA harness is being hardened separately to exercise real Production using:

- WebKit + iPhone descriptor
- Chromium + Android/Pixel descriptor

When it passes, its evidence must be recorded as **BROWSER_EMULATION**, never as `PHYSICAL_DEVICE`.

## Authenticated Production E2E boundary

The real Generate route requires a trusted Supabase authenticated and verified user before generation, then executes entitlement/credit handling, the Soolen engine, verification/self-heal, `apps` persistence, `app_versions` persistence, `current_version_id` linking and project-memory persistence.

The production project dashboard exposes the real post-generation outputs:

- App demo: `/a/{appId}?demo=1`
- Website preview: `/website/{appId}`
- Versions / Undo: `/app-dashboard/{appId}/versions`
- Release flow: `/release/{appId}`

The remaining proof is a **real authenticated Production run** through Generate → Save → App Demo → Website Preview → Versions/Undo → Release checks. It must not be replaced by an inserted `auth.users` row, fake cookie, bypassed middleware or mocked provider response.

Current evidence level for that external row remains: **LIVE PENDING**.

## SMS boundary

**SMS live work is intentionally ON HOLD.**

- Existing SMS code contracts may continue to run as regression checks.
- No live SMS provider configuration should be changed while the hold remains active.
- No SMS live score should increase until work is explicitly resumed and a real OTP is received and verified.

## External evidence still required

The following remain outside the scope of code/HTTP/browser-emulation proof:

- physical iPhone visual/touch/back-stack behavior
- physical-device/network performance profiling
- real microphone permission and speech behavior
- real iPhone Photos/Camera picker behavior
- authenticated Production Generate → Save → Preview
- premium image/video/avatar provider output
- real generated Game runtime proof where required
- real multiplayer relay/matchmaking/load/failover
- real Web Publish publish/unpublish lifecycle where external URL proof is required
- Apple developer account/signing/submission/review
- Google Play Console/signing/submission/review

Do not mark any of those as 100 until the matching evidence level has actually passed.
