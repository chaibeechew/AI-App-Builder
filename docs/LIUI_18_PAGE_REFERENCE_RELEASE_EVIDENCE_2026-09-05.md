# LANERIQ AI 18-Page Reference Release Evidence — 2026-09-05

This document records the release-control boundary for the user-approved LANERIQ AI reference redesign.

## Scope

- All 18 master product pages use the user-approved reference layout authority.
- Layout geometry, primary buttons, navigation, glass surfaces, state hierarchy and mobile treatment are treated as the active visual contract.
- The `/auth` entry uses the approved Enter Your Email / Check Your Email flow.
- LANERIQ-owned Email OTP remains eight digits and the verification screen exposes eight visual code cells while preserving one-time-code autofill.
- OTP entry geometry is bound to the active verification policy: Email remains 8 digits; the optional WhatsApp compatibility path remains 6 digits when enabled. The UI length, input slicing, maxLength and verify gate share the same active policy.
- The canonical 10-language catalog locks the approved Login and Templates reference copy instead of requiring retired pre-redesign labels.

## Functionality and truth boundaries

- Existing generation, project, workflow, database, quality, publishing, analytics, template and AI Assistant behavior is preserved behind the redesign.
- Template use remains inspiration-only and returns through normal AI Planning.
- Owner-scoped data and RLS boundaries remain authoritative.
- Store preparation must not be represented as official store submission, review or approval.
- Physical-device, live-provider and store evidence remain separate from code/CI evidence.
- Credits are not reintroduced.
- SMS remains ON HOLD and Login explicitly states that no paid SMS fallback is used.
- Mobile Community Compute remains disabled.
- Source repair at `614c7250b3effcfedb08cb5e58d1dc814a26f149` restored the Page 12 cross-feature runtime entries and the explicit no-paid-SMS Login truth boundary.
- Source head `1ba66cfb42ebfae7011a6126914480a1257b4fae` aligned Login and Templates multilingual contracts with the approved reference copy.
- Source head `38a38aa679e86d98dd37d3cd68bf05334f1ccde6` fixed a real active-policy mismatch in the verification UI. Targeted WhatsApp Auth, Email OTP, multilingual and Communications 100 contracts plus a Production build passed before commit.

## Browser/runtime evidence

- GitHub Actions browser smoke run `33967295066` built the exact branch source, started the optimized Next.js Production runtime locally and exercised it with headless Chromium at a 390×844 mobile viewport.
- The browser verified the visible approved mobile Login (`Enter Your Email`, brighter-tomorrow copy, 8-digit Email verification guidance), Home and Templates surfaces.
- Signed-out `/studio` remained session-gated, and signed-out `/my-apps` redirected to the LANERIQ auth boundary.
- Signed-out `/api/auth/session` remained HTTP 401 and did not report an authenticated session.
- No unexpected 5xx or browser page errors were observed. The exact `/api/auth/verification/status` 503 caused by the CI placeholder Supabase environment was classified separately as expected readiness-unavailable evidence and was not generalized to other 5xx responses.
- The temporary browser workflow and script were removed after the successful run; clean branch head `e06f6eefdf3b347cd478b610901d94d29e563925` retained only product/release changes.

## Release gate

Do not declare this redesign Production-complete until the final integration satisfies all of the following on the same release lineage:

1. exact-head GitHub CI is green;
2. exact-head Vercel Preview is READY;
3. browser/runtime QA covers the approved Login and protected/public route boundaries without bypassing authentication truth boundaries;
4. the PR is realigned to the latest `main` immediately before merge;
5. post-merge GitHub `main` SHA equals the Vercel Production SHA;
6. runtime verification confirms the deployed SHA and smoke checks show no unexpected 5xx/error regression.
