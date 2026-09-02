# Production Email Activation Checklist

1. Keep the existing GitHub repository, Supabase project, and Vercel project. Do not create duplicates.
2. Add `VERCEL_TOKEN` to GitHub Actions secrets.
3. For Gmail, add `GMAIL_USER` and `GMAIL_APP_PASSWORD`. `EMAIL_FROM` is optional and defaults to the Gmail account.
4. Alternatively, add generic `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS`, or `RESEND_API_KEY` plus `EMAIL_FROM`.
5. Run **LANERIQ Email Delivery Production Sync** with `workflow_dispatch`.
6. Confirm the workflow finishes the Vercel Production redeploy step.
7. Confirm `/api/auth/verification/status` reports `guard`, `storage`, and `delivery` ready.
8. Request a fresh Email Code and complete verification with that newly issued code.

Never paste email credentials into source files, issues, pull requests, logs, or chat-visible diagnostics. SMS remains outside this activation path.
