# LANERIQ AI Generated Experience Standard

## Why there are three documents

The standard is intentionally split into three layers because they solve different problems.

### 1. Generated App Visual Hard Rules — the law

These are universal non-negotiable quality rules for every generated App, Website and compatible non-game runtime. They define the minimum quality floor and what the system must reject.

Core rule: **LANERIQ quality is consistent; each customer's identity remains unique.**

Required:
- Premium first output, not a wireframe that needs a second pass before it looks finished.
- Mobile-first responsive layout with at least 44px touch targets.
- One coherent typography, spacing, card, CTA, icon, navigation, motion and background system across every page.
- Designed loading, empty, error, success, disabled, selected, focus and destructive states.
- One visually dominant primary action per major screen.
- Industry- and brand-appropriate imagery and palette.
- No browser-default blue links, default controls, naked tables or unrelated page styles.
- Visual QA must reject generic, unfinished or inconsistent first output.

Not required:
- Every customer using the same LANERIQ homepage image.
- Every customer using blue/gold/water/future-city styling.
- LANERIQ branding dominating the generated customer's own product.

The future-city/water look is a **LANERIQ Signature Theme**, not the only possible customer theme.

### 2. Property CRM Golden Reference — the example

This is the first high-quality reference App that proves what the standard looks like in one industry. It is not the universal template.

Hero direction:
- `PROPERTY COMMAND CENTER`
- `Your Properties. Your Clients. One Intelligent Workspace.`

Information architecture:
- Dashboard
- Properties
- Clients
- Viewings
- Reports

Dashboard priority:
- Portfolio value
- Property KPI
- Lead KPI
- Viewing KPI
- Follow-up KPI
- Hot Leads
- Upcoming Viewings
- AI Follow-Up Suggestions

Visual direction:
- Deep navy premium surfaces
- Restrained gold priority accents
- Ice-blue data accents
- High-end property / city / architecture imagery
- Glass depth without reducing legibility
- Mobile app navigation and fast action hierarchy

The current first Property CRM may use the LANERIQ future-city/water artwork as its golden-reference launch atmosphere. Future real-estate customers can receive original real-estate imagery that keeps the same quality level without cloning the exact artwork.

### 3. Page / Style Engineering Contract — the construction plan

This converts the visual standard into executable generator and runtime requirements.

Every generated page is expected to have a coherent shell:

`BackgroundLayer -> Header -> HeroOrPageHeader -> PrimaryContent -> PrimaryActions -> Navigation`

Every design system should expose coordinated tokens for:

`background, surface, surfaceElevated, primary, secondary, accent, textPrimary, textSecondary, border, success, warning, danger, radius, shadow, spacing, typography`

Minimum mobile values:
- page inline padding: 16px
- card radius: 18px
- control radius: 12px
- interactive tap target: 44px
- bottom navigation target height: 64px

Every page must share:
- typography
- spacing rhythm
- radii
- card language
- CTA hierarchy
- navigation
- form controls
- icon family
- motion language
- background logic

## System implementation

The executable policy lives in `lib/design/generated-experience-standard.js`.

`normalizeAppSpec()` applies the standard automatically after security hardening. This means generation and modification paths that use the shared normalizer inherit the premium standard without relying only on prompt compliance.

The generated App runtime applies the same standard to older saved specifications, so legacy projects receive a safe visual-quality uplift without requiring a database rewrite.

`app/generated-app-premium.css` provides the runtime quality floor. The Property CRM reference receives the signature future-city/water atmosphere and a premium mobile bottom navigation, while other industries continue to use their own design-system colors and wallpaper direction.

## Formal rule

> LANERIQ AI does not generate drafts. It generates premium first versions.
>
> Every App, Game and Website must feel intentionally designed, production-ready and visually coherent from the first generation.
>
> LANERIQ AI quality remains consistent; each customer's visual identity remains unique.
