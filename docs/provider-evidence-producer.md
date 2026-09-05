# LANERIQ Bounded External Provider Evidence Producer

## Purpose

This producer creates canonical external-provider evidence only through an explicit, administrator-authorized, synthetic health canary. It is not a general AI generation endpoint and it is not a way to bypass LANERIQ zero-cost policy.

## Access boundary

The only executable surface is `POST /api/ai/provider-router/evidence/canary`.

The path is not present in the public proxy allowlist, so it must first pass normal LANERIQ Session Authority. The route then independently requires LANERIQ administrator authority. There is no GET handler.

The request body accepts exactly one field: `provider`. Arbitrary prompts, user content, model parameters, fallback lists and output limits are rejected.

## Network fail-closed gates

No provider network request may occur unless all gates pass:

1. current cost mode is `free`;
2. the runtime is Vercel Production with an exact 40-character Git release SHA;
3. `LANERIQ_EXTERNAL_PROVIDER_EVIDENCE_CANARY_ENABLED=true`;
4. the provider is explicitly listed in `LANERIQ_EXTERNAL_PROVIDER_EVIDENCE_CANARY_PROVIDERS`;
5. the provider is one of the bounded adapters supported by this producer;
6. the current cost policy allows the provider;
7. a provider that may charge is listed in the verified free-tier account hard-stop set;
8. the provider credential/model configuration required by its adapter exists;
9. the dedicated Provider Evidence signing secret is configured;
10. the Provider Evidence bounded-canary policy allows the request.

Current LANERIQ Production uses `zero` mode, so external evidence canaries are blocked before network execution.

## Bounded execution

The producer uses one fixed synthetic prompt and never reads a user prompt. The request is single-provider and fallback is not allowed. The first supported adapter set is Groq, OpenRouter, Gemini, Cloudflare Workers AI and Hugging Face.

The output request cap is 64 tokens and is applied in the actual provider request (`max_tokens` or provider-specific `maxOutputTokens`). Provider text is not returned to the caller and is not stored in the canonical evidence receipt. A SHA-256 output digest may be returned for execution integrity without exposing content.

## Canonical receipt

A successful bounded call is converted into a `prve2` receipt and signed with the dedicated Provider Evidence signing authority. The receipt is then passed through the same exact-SHA, freshness, cost-policy, bounded-output, no-user-data and signature verification gates defined by Provider Evidence Control Plane v2.

A failed network call, missing gate, stale release, zero-mode state or invalid signature creates no canonical receipt.

## Cost truth

`configured`, `free-tier capable`, `runtime observed` and `LIVE_VERIFIED` remain different states. No environment-variable presence or ordinary Router success self-promotes a provider to LIVE.

The producer does not activate paid or balanced mode, does not add any provider to the zero-cost allowlist, does not create credits and does not introduce LANERIQ-owned dedicated servers.
