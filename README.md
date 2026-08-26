# AI-App-Builder

AI App Builder — Create, Modify, Test, Publish & Rollback.

## Foundation added

- Email OTP authentication
- Phone SMS OTP authentication
- Verified-user gate before app generation/modification
- Persistent My Apps dashboard
- Continue editing saved apps
- App version history and rollback
- Supabase Auth + Database
- Row Level Security (RLS) per user
- Server-side API authentication
- Referral code generation and referral relationship tracking
- Referral reward ledger with anti-self-referral constraints
- Secrets kept server-side; only Supabase publishable client key is exposed
- Vercel environment-variable ready

## Required Vercel environment variables

Set these in the Vercel project for Production and Preview as appropriate:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY`

Do not put a Supabase secret/service-role key in client code or any `NEXT_PUBLIC_*` variable.

## Supabase setup

Run the SQL migration:

`supabase/migrations/20260826000000_ai_app_builder_foundation.sql`

Then enable/configure:

1. Email OTP in Supabase Auth.
2. Phone Auth and an SMS provider in Supabase Auth.
3. An email template containing `{{ .Token }}` if email OTP should be six digits instead of a magic link.
4. The production Site URL and redirect URLs.

## User flow

Register/login → verify email/phone → create app → automatic save → My Apps → continue editing → new version → rollback.

Referral flow:

Referral code → new user → verification → first app created → qualification → reward ledger entry.

The reward amount is intentionally configurable in the database instead of hard-coded into the client.
