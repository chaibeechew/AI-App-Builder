# LANERIQ AI 18-Page Reference Release Evidence — 2026-09-05

This document records the release-control boundary for the user-approved LANERIQ AI reference redesign.

## Scope

- All 18 master product pages use the user-approved reference layout authority.
- Layout geometry, primary buttons, navigation, glass surfaces, state hierarchy and mobile treatment are treated as the active visual contract.
- The `/auth` entry uses the approved Enter Your Email / Check Your Email flow.
- LANERIQ-owned Email OTP remains eight digits and the verification screen exposes eight visual code cells while preserving one-time-code autofill.

## Functionality and truth boundaries

- Existing generation, project, workflow, database, quality, publishing, analytics, template and AI Assistant behavior is preserved behind the redesign.
- Template use remains inspiration-only and returns through normal AI Planning.
- Owner-scoped data and RLS boundaries remain authoritative.
- Store preparation must not be represented as official store submission, review or approval.
- Physical-device, live-provider and store evidence remain separate from code/CI evidence.
- Credits are not reintroduced.
- SMS remains ON HOLD.
- Mobile Community Compute remains disabled.

## Release gate

Do not declare this redesign Production-complete until the final integration satisfies all of the following on the same release lineage:

1. exact-head GitHub CI is green;
2. exact-head Vercel Preview is READY;
3. browser QA covers the approved Login flow and the 18-page route surface;
4. the PR is realigned to the latest `main` immediately before merge;
5. post-merge GitHub `main` SHA equals the Vercel Production SHA;
6. runtime verification confirms the deployed SHA and smoke checks show no unexpected 5xx/error regression.
