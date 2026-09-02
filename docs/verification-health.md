# LANERIQ Verification Health

`GET /api/auth/verification/status` is a provider-opaque, no-store readiness endpoint for Email Verification.

It returns only LANERIQ-facing readiness booleans for:
- guard
- storage
- delivery

It must never return provider names, recipient data, OTP values, API keys, secrets, raw error stacks, or credentials.

The endpoint is intended for production diagnostics before a customer attempts to request an Email Code.
