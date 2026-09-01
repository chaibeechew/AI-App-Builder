# LANERIQ AI

**Build App Web & Game**  
**3-in-1 AI Creation Platform**  
**Create Anything. From One Idea.**

Powered by **SoolenAI**.

LANERIQ AI is an AI creation platform for planning, creating, modifying, testing and managing Apps, Websites and Pro Game projects from natural-language ideas.

## Core platform foundation

- Email OTP authentication
- Phone/SMS OTP integration path (requires a configured live SMS provider)
- Verified-user gate before App generation and modification
- Persistent My Creations / project dashboard
- Continue editing saved Apps and Websites
- Version history and rollback
- Supabase Auth + Database
- Row Level Security (RLS) per user
- Server-side API authentication
- Referral code generation and referral relationship tracking
- Referral reward ledger with anti-self-referral constraints
- Secrets kept server-side; only Supabase publishable client configuration is exposed
- Vercel environment-variable ready
- AI planning, generation, verification, repair and self-heal pipeline
- App + Website generation workflow
- Pro-only Game creation policy and entitlement controls
- Credits and server-side entitlement handling
- Brand Kit, media references and project memory support
- Multilingual interface foundation

## Product positioning

**LANERIQ AI**  
Build App Web & Game  
Apps • Games • Web  
Create Anything. From One Idea.

Game creation is a **Pro feature**. Commercial Game Mode has no buyout license and follows the platform's continuing 5% game-profit-share policy.

## Required Vercel environment variables

Set the required environment variables in the Vercel project for Production and Preview as appropriate. Current integrations may include:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- AI provider keys configured server-side

Do not put Supabase secret/service-role keys, AI provider secrets or other privileged credentials in client code or any `NEXT_PUBLIC_*` variable.

## Supabase setup

Run the repository's Supabase migrations in order. Historical migration filenames may still contain the earlier technical `ai_app_builder` identifier; those filenames are retained to preserve migration integrity and should not be renamed after application.

Then enable/configure the required services, including:

1. Email OTP in Supabase Auth.
2. Phone Auth plus a live SMS provider before claiming SMS OTP as operational.
3. The email OTP template used by LANERIQ AI.
4. Production Site URL and redirect URLs.

## Core user flow

Register / login → verify account → describe an idea → AI planning → generate App + Website → automatic save → preview → modify → version history → rollback → release workflow.

Referral flow:

Referral code → new user → verification → first qualifying App created → qualification → reward ledger entry.

Reward amounts remain server-controlled and configurable rather than hard-coded into the client.

---

**Customer-facing brand:** LANERIQ AI  
**Powered by:** SoolenAI
