# LANERIQ Zero-Cost OmniChannel Communication Router

## Goal

Keep LANERIQ external communication spend at `RM0` by default while preserving provider-opaque compatibility with In-App, Push, Email, Telegram, LINE, WeChat, WhatsApp and SMS.

The ZERO mode does **not** claim that every external provider is free. It enforces a fail-closed rule: a route can be selected only when LANERIQ has explicit cost metadata proving that the route is free, or that a known free quota still has remaining capacity. Paid and unknown-cost routes are blocked before any sender is called.

## Core rules

- `mode = zero`
- `externalSpendCap = 0`
- paid providers are blocked
- unknown-cost providers are blocked
- free-quota routes require an explicit positive remaining-quota value
- free quota may not spill into paid overage
- customer/BYOP billed routes are never auto-selected and require explicit opt-in
- SMS remains compatible but paid SMS remains disabled in ZERO mode
- WhatsApp remains compatible but defaults to paid-cost classification unless an explicit safe cost classification is configured
- provider fallback is allowed only across routes that independently pass the ZERO-cost gate

## Default channel priority

1. In-App
2. Push
3. Email
4. Telegram
5. LINE
6. WeChat
7. WhatsApp
8. SMS

User preference may move a channel earlier, but it never overrides the cost gate.

## Adapter contract

Every channel adapter implements the same interface:

- `send`
- `validateRecipient`
- `checkCapability`
- `normalizeReceipt`
- `normalizeError`
- `handleWebhook`
- `getDeliveryStatus`

Email and WhatsApp retain their existing implemented senders. The other channels now have the complete provider-opaque adapter contract but intentionally return `integration_required` until an actual provider implementation is added and configured.

## Cost classes

- `free`
- `free_quota`
- `customer_billed`
- `paid`
- `unknown`

`paid` and `unknown` are always blocked in ZERO mode. `free_quota` is blocked if quota is absent, unknown or exhausted. `customer_billed` is blocked unless the caller explicitly allows a customer-owned provider for that action.

## Environment metadata

Channel cost metadata uses `LANERIQ_<CHANNEL>_COST_CLASS`.

Free-quota counters use `LANERIQ_<CHANNEL>_FREE_QUOTA_REMAINING` where applicable. Email specifically recognizes `LANERIQ_EMAIL_FREE_QUOTA_REMAINING`. A Gmail SMTP configuration is classified as `free_quota` by default, but remains blocked by the ZERO router until a positive remaining quota is supplied. This prevents accidental overage assumptions.

Provider-ready flags for contract-only channels may be represented by `LANERIQ_<CHANNEL>_PROVIDER_READY=true`, but a provider-ready flag does not make a channel LIVE and does not bypass `sendImplemented` or the ZERO-cost gate.

## Evidence truth

- Adapter contract present: `CODE`
- Configured provider with implemented sender: `PROVIDER_READY`
- Successful external provider delivery: `LIVE`
- Physical phone receipt/interaction: `DEVICE_VERIFIED`

No CODE-only adapter is labeled LIVE.

## Existing verification authority

LANERIQ remains the OTP authority. Channels are transports only. Email, SMS, WhatsApp, WeChat, LINE, Telegram or Push must not become independent OTP authorities. This allows providers to be replaced without migrating user authentication state.

## Next provider implementation stages

1. Keep Email working as the first production transport.
2. Add free/zero-cost Push and In-App senders.
3. Add Telegram sender and identity binding.
4. Add LINE and WeChat provider adapters with consent and platform-specific policy enforcement.
5. Add WhatsApp only when cost metadata makes the selected route eligible for the chosen mode.
6. Add SMS provider/SMPP adapters as reliability fallback; paid SMS remains excluded from ZERO mode.

This architecture is server-independent and can continue to run behind LANERIQ's Provider Router until dedicated infrastructure becomes economically justified.
