# Batch 128 — Media Zero-Cost Admission

## Goal

Extend LANERIQ Zero-Cost-First governance from Chat/App Builder into media generation without weakening the existing provider, durability, privacy, or replay boundaries.

## Media admission rules

- Image / Avatar external runtimes are admitted only when the runtime is declared `zero`, or when `free` capacity has an explicit provider hard-stop in `IMAGE_GENERATION_FREE_TIER_HARD_STOP_PROVIDERS`.
- A runtime merely labelled `free` is not trusted as free. In `free` mode it is blocked without hard-stop evidence. In `balanced` / `paid` it is conservatively treated as metered.
- Video remains device/draft-first in `zero` and `free` modes. Remote cloud rendering stays blocked in those modes, preserving `cloudVideoAllowed=false` and `externalSpendCap=0`.
- Metered image/video execution is admitted only in `balanced` or `paid` modes.
- Zero and verified-free compute paths never require AI credits. `consumeAiCredits` and refunds are bypassed whenever compute mode is `zero` or `free`, in addition to the existing No-Credits Launch Mode bypass.

## Existing safety boundaries preserved

- Image and Avatar provider outputs still require approved HTTPS/data-image output and durable private Asset Library capture before model output is claimed.
- Image and Avatar still have truthful local SVG/wallpaper fallbacks.
- Avatar likeness consent rules are unchanged.
- Video still requires atomic render claim, downstream idempotency, approved output path, and durable MP4 capture before completion.
- Video falls back to a saved draft rather than claiming a render when no admitted renderer exists.
- Provider identities and credentials remain server-side.
- SMS and Email scope are unchanged.

## Evidence boundary

This batch proves code-level admission and CI behavior. It does not prove permanent provider free quota, provider billing statements, native mobile/desktop video rendering, or unlimited media capacity. Production truth still requires exact-SHA deployment/runtime verification after merge.
