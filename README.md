# LANERIQ AI

**Build App Web & Game**  
**3-in-1 AI Creation Platform**  
**Create Anything. From One Idea.**

Powered by **SoolenAI**.  
Repository: **chaibeechew/LANERIQ-AI**

LANERIQ AI is an AI creation platform for planning, creating, modifying, testing and managing Apps, Websites and Pro Game projects from natural-language ideas.

## Core platform foundation

- Email OTP authentication
- Phone/SMS OTP code path retained for future activation; **live SMS is intentionally ON HOLD** until provider testing is explicitly resumed
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

## License model — no Buyout License

LANERIQ AI does **not** offer a Buyout License option for App, Website, Game or Enterprise projects. There is no personal, business, enterprise or custom-quote one-time buyout that removes an otherwise applicable continuing revenue-share obligation. Customer project ownership and portability are handled separately from any buyout concept.

Historical database migrations may retain earlier internal `buyout` naming for migration integrity and legacy compatibility. Those historical names are not a current customer-facing product or purchasable license option.

## Creator-first Game policy

LANERIQ AI is designed to encourage creators to keep building.

- **Professional — US$68 / 12 months:** normal genuine Game creation is included. If unusually heavy repeated Game starts trigger Fair Use, only new Game creation enters a temporary progressive cooldown: **30 minutes → 1 hour → 2 hours → 4 hours → maximum 8 hours**. When the cooldown ends, Game creation resumes automatically. App, Website and ordinary LANERIQ AI features remain available throughout. After seven quiet days, the escalation level resets.
- **Full Access — US$199 / 12 months:** includes Professional features and removes the ordinary progressive Game Creator cooldown for high-volume creators. Security, automated-abuse and infrastructure-protection safeguards still apply.
- A Game cooldown never deletes or locks the creator's saved projects.
- There are no surprise per-click Game creation charges under these creator plans.

### Game ownership and commercial sales

Creators keep ownership of their LANERIQ AI-generated games. Game projects do not offer a buyout license.

When a LANERIQ AI-generated game is sold commercially, LANERIQ AI receives a continuing **5% share of game sales revenue**. This applies across **all sales channels**, including LANERIQ AI, Apple App Store, Google Play, Steam, other marketplaces, independent websites and direct/off-platform sales.

The sales-share basis excludes separately stated taxes, refunds and chargebacks. Platform/store commissions and creator operating costs do not reduce the 5% sales-share basis. The obligation continues after Professional or Full Access ends. Production legal terms must define reporting and payment timing before commercial launch.

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
2. Phone Auth plus a live SMS provider **only when SMS work is resumed**; do not claim SMS OTP as operational before a real received/verified OTP is proven.
3. The email OTP template used by LANERIQ AI.
4. Production Site URL and redirect URLs.

## Core user flow

Register / login → verify account → describe an idea → AI planning → generate App + Website → automatic save → preview → modify → version history → rollback → release workflow.

Referral flow:

Referral code → new user → verification → first qualifying App created → qualification → reward ledger entry.

Reward amounts remain server-controlled and configurable rather than hard-coded into the client.

## Production evidence

Live Production, browser-emulation and external-evidence results are recorded in [`docs/PRODUCTION-EVIDENCE.md`](docs/PRODUCTION-EVIDENCE.md). The evidence ledger intentionally separates code proof, automated browser proof and physical-device/provider/store proof.

---

**Customer-facing brand:** LANERIQ AI  
**Powered by:** SoolenAI