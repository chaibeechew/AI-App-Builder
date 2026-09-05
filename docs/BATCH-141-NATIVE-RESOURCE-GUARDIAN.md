# Batch 141 — Mother AI Native Resource Guardian

## Goal

Move Mother AI device-compute safety from web/policy intent into a native-runtime admission contract that can be consumed by future signed iOS, iPadOS and Android shells without opening Community Compute on mobile.

Batch 141 is deliberately conservative:

- Mobile is **Personal Compute only**.
- Community Compute remains **Desktop-only in concept and globally execution-gated**.
- Mobile background work must be granted and scheduled by the operating system.
- LANERIQ does not create a permanent mobile worker, bypass power management, manufacture background runtime, or hold wake locks for optional AI compute.
- 0% is always a valid compute budget.

## Current platform-policy alignment

The implementation is designed around current store-policy constraints rather than trying to maximize device extraction.

### Apple

Apple's App Review Guidelines require efficient power use, prohibit excessive heat/unnecessary resource strain, prohibit unrelated background processes, and restrict background services to their intended purposes. Apple's BackgroundTasks guidance makes background execution system-managed and discretionary.

Batch 141 therefore requires:

- user-purpose-bound Personal Compute;
- Low Power Mode admission blocking;
- real `ProcessInfo.thermalState` telemetry when available;
- legitimate host-provided iOS background lease state;
- no Community Compute on iOS/iPadOS;
- no self-scheduling by the telemetry adapter;
- no downloaded executable Community workloads.

### Google Play / Android

Google Play monitors excessive wake locks and battery behavior, and Android recommends system-managed scheduling such as WorkManager for deferrable background work.

Batch 141 therefore requires:

- user-purpose-bound Personal Compute;
- Android Power Saver admission blocking;
- public `PowerManager.currentThermalStatus` when supported;
- WorkManager-style host-provided background lease state;
- metered-network protection for larger optional background transfers;
- no wake-lock creation in the telemetry adapter;
- no forced foreground service for optional compute;
- no Community Compute on Android.

## Native telemetry contract

The future signed native shell supplies a snapshot through the LANERIQ native bridge. The normalized contract includes:

- bridge version;
- platform;
- lifecycle state;
- thermal state;
- Low Power / Power Saver state;
- battery level;
- charging state;
- background lease type;
- whether host-declared system constraints are satisfied;
- network type;
- metered-network state;
- device idle state;
- user-active state.

Browser JavaScript must not invent missing native telemetry.

## Native Resource Guardian admission

### Mobile foreground Personal Compute

Eligible only when:

- explicit Personal Compute consent remains valid;
- the task serves the user's LANERIQ purpose;
- Low Power / Power Saver is OFF;
- thermal state is not serious/critical.

Native mobile ceiling is capped at **3%**, below the global 5% ceiling.

If mobile thermal telemetry is unknown or warm/fair, the native admission ceiling is capped at **1%**.

### Mobile background Personal Compute

In addition to the foreground rules:

- iOS/iPadOS requires a legitimate system-managed background lease and satisfied host constraints;
- iOS/iPadOS optional background compute requires nominal thermal state;
- Android requires a WorkManager-style background lease and satisfied host constraints;
- larger optional transfers are blocked on a metered background connection.

LANERIQ settings cannot force mobile background compute ON.

### Mobile Community Compute

Always blocked.

This is enforced independently of user preference so a stale or hostile stored setting cannot convert a mobile client into a Community worker.

### Desktop Community Compute candidate

Batch 141 may classify a Desktop as a future candidate only when it is:

- Desktop platform;
- plugged/charging;
- idle;
- user not active;
- nominal thermal state;
- not in Low Power mode;
- on an unmetered connection.

Even when all conditions pass, **Community execution remains false**. The reason is `community_runtime_globally_gated` until later security, DPIA, legal, cross-border, node-integrity and production evidence gates are complete.

## Fallback priority

When native local Personal Compute is blocked:

1. the user's own linked Desktop is preferred when reachable;
2. approved cloud/provider fallback may be used when internet is available;
3. otherwise the task may be queued offline.

This preserves the same-user privacy/cost preference established by the zero-cost architecture.

## Native source scaffolds

- `native/ios/MotherAIResourceGuardian.swift`
- `native/android/MotherAIResourceGuardian.kt`

These files are source-level adapters for future native shells. They are intentionally limited to public platform telemetry and explicit host-provided lifecycle/background state.

They do not prove:

- Xcode compilation;
- Android Gradle compilation;
- code signing;
- App Store acceptance;
- Google Play acceptance;
- physical-device behavior;
- production background execution.

## Verification gate

`scripts/native-resource-guardian-contract-tests.mjs` verifies:

- mobile Community Compute is blocked;
- native mobile Personal Compute ceiling is conservative;
- Low Power / heat / consent withdrawal produce 0% optional compute;
- iOS background execution requires a legitimate system-managed lease;
- Android background execution requires a WorkManager-style lease;
- metered background network protection;
- same-user Desktop fallback precedes cloud;
- Swift adapter uses public thermal/power/battery APIs and does not self-schedule background work;
- Android adapter uses public thermal/power/network APIs and does not create wake locks or force foreground services;
- public policy/API and UI expose the same runtime truth.

## Evidence status

Batch 141 can become **CODE / CONTRACT / WEB-RUNTIME VERIFIED** after CI passes.

It must remain **NATIVE BUILD PENDING / REAL DEVICE PENDING / STORE REVIEW PENDING** until signed native shells exist and physical-device/store evidence is attached.
