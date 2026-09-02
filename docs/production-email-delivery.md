# LANERIQ Production Email Delivery

LANERIQ Email Verification owns OTP generation, challenge storage, verification, and the primary LANERIQ session. Outbound email is a replaceable transport behind the LANERIQ encrypted email queue.

## Production transport choices

The Production sync workflow supports either of these transport contracts:

### Gmail / Google Workspace SMTP

Required GitHub Actions secrets:

- `VERCEL_TOKEN`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

Optional:

- `EMAIL_FROM` — defaults to `GMAIL_USER`

For Gmail mode, the workflow maps the credentials into Vercel Production as `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`. Grouping whitespace in a pasted Gmail App Password is removed before synchronization. Secret values are never printed.

A generic SMTP service can be used instead with `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, optional `SMTP_PORT` (default `465`), and optional `EMAIL_FROM` (default `SMTP_USER`).

### Resend

Required GitHub Actions secrets:

- `VERCEL_TOKEN`
- `RESEND_API_KEY`
- `EMAIL_FROM`

Resend remains an optional replaceable transport and is not the LANERIQ OTP authority.

## Deployment behavior

`.github/workflows/email-delivery-production-sync.yml` validates that one complete transport is available, upserts only Production environment values into the existing LANERIQ AI Vercel project, and then creates a fresh Production deployment so the new environment is active immediately.

The workflow does not create another Vercel project and does not modify SMS settings.

## Readiness verification

After deployment, `GET /api/auth/verification/status` is the safe readiness check. It exposes only LANERIQ-facing booleans for `guard`, `storage`, and `delivery`; provider names, credentials, OTPs, recipient data, and raw provider errors remain private.

Email Code requests must remain unavailable when the delivery stage is false. This fail-closed behavior prevents a user from receiving a challenge that cannot be delivered.
