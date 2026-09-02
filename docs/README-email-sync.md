# LANERIQ Email Verification Production Notes

Production Email Verification transport hardening is documented in:

- `docs/production-email-delivery.md`
- `docs/production-email-delivery-checklist.md`

The runtime remains LANERIQ-owned for OTP generation, verification, and session authority. The outbound provider is replaceable and SMS is not used as a fallback.
