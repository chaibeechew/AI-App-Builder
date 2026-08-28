# Soolen AI Local + Cloud Autonomous AI Architecture

## Goal
Give the user an AI experience that can use local Llama-class models where practical, while retaining cloud providers as fallback capacity.

## Runtime model
1. User opens Soolen AI and starts an AI task.
2. The app starts an explicit local AI session when a supported local model is available.
3. Local AI handles suitable lightweight tasks first.
4. If the task needs stronger reasoning or local capability is unavailable, the router can use configured cloud providers.
5. When the user stops/leaves the active AI task, the app should stop/cancel the local task and release resources where the platform permits.
6. The app must not claim that cloud AI is unlimited merely because multiple providers are configured.

## Provider order
Local Llama-class model first, then configured free/low-cost cloud providers, then paid cloud providers according to the account's configured policy.

Initial provider adapters:
- local-llama
- Gemini
- DeepSeek
- OpenAI

The router is intentionally provider-neutral so additional providers can be added later without changing the creator workflow.

## Quota strategy
Provider exhaustion is a routing event, not a product failure. A provider that reaches quota, rate limits, or becomes unavailable is marked unavailable for the current task/window and the router tries another configured provider when appropriate.

## Mobile reality
Local AI behavior is device-dependent. iOS and Android have different model/runtime constraints. The product should use a platform-appropriate local inference runtime rather than assuming desktop Ollama can run unchanged inside a mobile app.

## Privacy
Local inference should be preferred for tasks that can safely run on-device. Cloud fallback must be explicit in the product's privacy/terms documentation, with clear disclosure that content may be sent to the selected cloud provider when cloud inference is used.

## Cost protection
- Local-first for suitable tasks.
- Automatic cloud fallback.
- No promise of unlimited cloud API usage.
- Track provider usage and failures.
- Failed paid AI operations must be refundable according to the credit/refund rules.
- Business/high-volume usage remains subject to fair-use controls.
