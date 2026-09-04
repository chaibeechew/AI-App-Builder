# LANERIQ AI Capacity Evidence Plan

Version: 2026-09-04

## Purpose

LANERIQ AI must not turn architecture assumptions, synthetic tests, Preview tests, or MAU planning ranges into unsupported LIVE concurrency claims.

This plan separates five evidence levels:

1. `MODEL_ONLY` — architecture and capacity model only.
2. `SYNTHETIC_CI` — deterministic zero-network workload simulation in CI.
3. `PREVIEW_LOAD` — measured load against an isolated Vercel Preview or equivalent non-Production environment.
4. `PRODUCTION_LOAD` — measured Production application load with bounded, approved traffic that does not require Provider LIVE generation.
5. `PROVIDER_LIVE` — measured end-to-end generation load using the actual Provider Router and real provider quotas.

A higher level never backfills independent evidence such as physical iPhone/Android QA or App Store / Google Play submission evidence.

Every capacity result used for merge or release decisions must be tied to the exact PR or Production commit SHA being evaluated.

## Stage targets

The first capacity gate uses three synthetic concurrent-user targets:

- 1,000 concurrent virtual users
- 5,000 concurrent virtual users
- 10,000 concurrent virtual users

The CI profile models 10% of users requesting generation at the same time and 800 modeled generation slots. These numbers exist only to exercise pressure transitions and protection behavior. They are not Production capacity measurements and are not a promise that 800 live generation slots exist.

The expected synthetic pressure progression is:

- 1,000 users / 100 modeled generation requests: normal
- 5,000 users / 500 modeled generation requests: elevated
- 10,000 users / 1,000 modeled generation requests: emergency

At emergency pressure, critical and interactive work must remain protected while lower-priority work is deferred or shed according to the existing admission-control policy.

## Claim rules

An app-level concurrent-user claim requires `PRODUCTION_LOAD` evidence with a measured concurrency greater than or equal to the claimed number.

A concurrent AI-generation claim requires `PROVIDER_LIVE` evidence with a measured generation concurrency greater than or equal to the claimed number.

`MODEL_ONLY`, `SYNTHETIC_CI`, and `PREVIEW_LOAD` must never be presented as Production capacity.

MAU planning ranges are separate from concurrent-load evidence. The existing 20,000–50,000 MAU first-server planning window remains an advisory infrastructure trigger, not proof of simultaneous users or simultaneous generations.

## Safety boundaries

The CI capacity gate must:

- make zero network requests;
- make zero AI provider calls;
- make zero paid provider calls;
- make no Production mutation;
- exercise neither SMS nor Email;
- make no physical-device claim;
- make no App Store / Google Play claim;
- add no dedicated server or paid queue requirement.

SMS remains ON HOLD until explicitly restored by the product owner.

## Next validation step

After this CI gate is green, the next evidence step is an isolated Preview load harness. That harness must be explicitly non-Production, rate-bounded, separately authorized, and prevented from invoking paid providers or communication channels. Only after Preview behavior is stable should Production application load and Provider LIVE generation capacity be measured as separate gates.
