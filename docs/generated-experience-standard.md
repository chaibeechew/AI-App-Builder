# LANERIQ AI Generated Experience Standard

## Why there are three layers

The standard is intentionally split into three layers because they solve different problems.

### 1. Generated App Visual Hard Rules — the law

These are universal non-negotiable quality rules for every generated App, Website and compatible runtime. They define the minimum quality floor and what the system must reject.

Core rule: **LANERIQ quality is consistent; each customer's identity remains unique.**

Required:
- Premium first output, not a wireframe that needs a second pass before it looks finished.
- Image-led or visually meaningful first screen whenever the industry benefits from imagery.
- Foreground copy stays concise and readable; the main visual subject remains visible.
- Mobile hero titles normally stay around 28–40px and major section headings around 22–30px.
- Mobile-first responsive layout with at least 44px touch targets.
- One coherent typography, spacing, card, CTA, icon, navigation, motion and background system across every page.
- Designed loading, empty, error, success, disabled, selected, focus and destructive states.
- One visually dominant primary action per major screen.
- Industry- and brand-appropriate imagery, color system, icon language and mood.
- Major images and compositions must vary across pages/projects instead of repeating one scene everywhere.
- No browser-default blue links, default controls, naked tables or unrelated page styles.
- Visual QA must reject generic, unfinished, inconsistent, industry-irrelevant or text-only first output where meaningful media is appropriate.

Not required:
- Every customer using the same LANERIQ homepage image.
- Every customer using blue/gold/water/future-city styling.
- LANERIQ branding dominating the generated customer's own product.

The future-city/water look is a **LANERIQ Signature Theme**, not the only possible customer theme.

### 2. Industry Visual Map — the adaptation layer

The first output must visually make sense for the business before stylistic effects are added. `lib/design/industry-visual-system.js` is the automatic starting point when the customer has not supplied a Brand Kit or explicit palette.

Examples:

| Industry | Visual subjects | Auto-theme character |
| --- | --- | --- |
| Real Estate | buildings, apartments, houses, interiors, agents, clients, maps, devices | deep blue / gold, architectural, trustworthy |
| Restaurant & Hospitality | dishes, drinks, dining spaces, staff, guests | warm earth / gold, appetizing, welcoming |
| Beauty & Wellness | treatment rooms, skincare, professionals, clients | soft rose / neutral / gold, elegant, refined |
| Education | students, teachers, learning spaces, tablets, books | blue / warm accent, clear, encouraging |
| Health & Medical | clinicians, patients, consultation spaces, health data | white / blue-green, calm, trustworthy |
| Finance & Investment | dashboards, professionals, charts, mobile finance | deep navy / restrained gold, precise, stable |
| Travel | destinations, hotels, travelers, routes, maps | ocean / teal / sand-gold, open, aspirational |
| Retail & Commerce | products, packaging, customers, shopping UI | product-led color, energetic, conversion-aware |
| Games | characters, worlds, arenas, vehicles, quests | immersive, genre-specific, high-contrast |
| Corporate Services | teams, meetings, workspaces, documents, devices | professional blue / neutral / gold, organized |
| Creator & Media | creators, cameras, editing screens, content sets | expressive violet / gold, visual-first |
| Logistics | vehicles, warehouses, routes, drivers, packages | teal / orange accent, operational, location-aware |
| Automotive | vehicles, workshops, technicians, dealerships | technical blue / dark neutral / metal-gold |
| Fitness & Sports | athletes, coaches, gyms, movement, wearables | green / energetic warm accent, progress-led |

Rules:
- Auto Theme fills missing colors from the detected industry profile.
- Existing customer colors, explicit style selections and Brand Kit choices stay authoritative.
- The system changes more than color: imagery, people/actions, card language, icons, atmosphere and scene composition adapt too.
- Different industries may share the same premium quality floor but must not look like one template with different words.
- SoolenAI creates a page-aware media plan with distinct subjects, viewpoints, lighting and actions so the same image is not reused everywhere.

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
- hero title normal range: 28–40px
- section heading normal maximum: 30px

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

Every generated specification also receives:
- `industryVisualProfile` — detected industry, mood, subjects, actions, recommended palette and avoid-list.
- `industryMediaPlan` — page-aware non-repeating visual scene descriptions and wallpaper fallbacks.
- `distributionPlan` — share/private-link, PWA install and native-store preparation paths.

## Property CRM Golden Reference — the first example

The Property CRM remains the first high-quality reference App that proves what the standard looks like in one industry. It is not the universal template.

Hero direction:
- `PROPERTY COMMAND CENTER`
- concise foreground title and description
- clearly visible high-rise / house / apartment environment
- agents or clients using a phone, tablet or computer where suitable

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
- Real service people and devices when useful
- Glass depth without hiding the background subject
- Mobile app navigation and fast action hierarchy

The first Property CRM can use the current LANERIQ future-city / people artwork as a launch reference. Future real-estate customers should receive original real-estate scenes at the same quality level without cloning the exact artwork.

## Fast-build learning

SoolenAI should use validated experience to shorten the first build instead of repeating avoidable design decisions.

Preferred one-pass sequence:

`understand idea -> infer industry/audience -> choose Auto Theme or customer brand -> plan distinct scenes -> compose pages/data/actions -> apply premium design system -> build functional first version -> verify mobile/core actions -> prepare share/install/store paths`

Only request extra information when it is genuinely required for safety, external credentials, compliance or an explicit customer brand choice.

## Distribution standard

Every generated App should be prepared for:
- a shareable or private/authenticated web link
- installable PWA behavior for iPhone/Android where supported
- iOS TestFlight / App Store Connect preparation
- Android internal/closed testing / Google Play preparation

External store publication is never marked complete until real submission and approval evidence exists.

## System implementation

The executable policy lives in:
- `lib/design/generated-experience-standard.js`
- `lib/design/industry-visual-system.js`
- `lib/soolen/app-generation-lessons.js`

`normalizeAppSpec()` applies the standard automatically after security hardening. Generation and modification paths that use the shared normalizer therefore inherit the premium standard without relying only on prompt compliance.

The generated App runtime applies the same standard to older saved specifications, so legacy projects receive a safe visual-quality uplift without a database rewrite.

`app/generated-app-premium.css` supplies the base runtime quality floor. `app/generated-industry-visual-v2.css` keeps background imagery visible and constrains oversized mobile type across ordinary generated Apps. The Property CRM golden reference has its own dedicated final layer.

## Formal rule

> LANERIQ AI does not generate drafts. It generates premium first versions.
>
> Background/media creates the industry context. Foreground text explains it clearly without overpowering the visual.
>
> Each industry receives its own color, imagery, mood and interaction character. Repetitive generic images are not allowed.
>
> LANERIQ AI quality remains consistent; each customer's visual identity remains unique.
