# LANERIQ AI 18-Page Master Product Specification

Version: 2026.09-v3 / LIUI-2026.2

This is the implementation contract for the 18-page LANERIQ AI product surface. It is not a screenshot catalog and it is not an 18-step wizard. It defines navigation, ownership, AI behavior, release risk and evidence boundaries for the real App/Web/iOS/Android/Desktop builder.

## Master flow

Core creation journey:

1. Home / Idea
2. Create Project / Plan
3. Build Progress
4. Preview
5. Launch
6. Manage & Grow

Global product areas:

7. My Projects / Creations
8. Templates
9. AI Assistant
10. Automation
11. Analytics & Growth
12. More & Settings

Power workspace:

13. Project Detail / AI Editor
14. Template Detail
15. Workflow Editor
16. Database Manager
17. AI Testing & Self-Heal
18. Publish & Deployment Center

The user-facing creation journey is:

`Idea → Plan → Build → Preview → Launch → Manage`

The high-value real execution chain is:

`Idea → Plan → Build → AI Editor → Testing/Self-Heal → Publish`

## Navigation contract

Global bottom navigation is fixed to:

`Home / Projects / Create / Templates / More`

The six-step creation journey is a contextual progress system, not a global tutorial. It should appear only while a user is inside an active creation flow. Global pages such as Projects, Templates, Analytics and Settings should not pretend that they are build-step screens.

## Homepage structure contract

The approved Page 1 stack is:

`Hero → Intent Composer → Create Image / Design UI → Style → Templates → Build CTA`

The first useful action should be reachable within two taps. Long intent text expands into a large editor without losing the draft. The main Build action remains visually dominant.

## UI contract

All 18 pages use **LANERIQ AI Living Intelligence UI™ / Adaptive Generative Interface System 2026 (LIUI-2026.2)** as the current design authority.

- intent-first interaction
- context-adaptive / generative layout
- Adaptive Bento where useful
- Living Cards with explicit Idle / Listening / Thinking / Working / Needs Attention / Success / Error / Offline states
- selective semi-transparent Liquid Intelligence Glass instead of an all-page glass sheet
- contextual cinematic backgrounds with automatic readability protection
- restrained gold primary actions and blue/purple AI-state accents
- semantic motion that communicates state rather than decoration
- voice-native and universal AI command access
- accessibility, trust, permission and performance adaptation by default
- light/warm primary prompt surfaces for readability
- long prompts expand into a large editor instead of shrinking text

**Big Moon Valley is retired as the active LANERIQ AI product shell.** Historical Big Moon assets or compatibility styles may remain in the repository only for migration/backward-compatibility purposes; they must not override the current LIUI presentation. The current homepage first-paint authority is **Future City + People**, and contextual/adaptive backgrounds may vary later without restoring Big Moon as the default shell.

## Data and ownership contract

Real project screens must use owner-scoped persisted data. Mock metrics may be used only in explicitly labeled design/demo environments and must never be presented as live Production data.

Key persisted domains include:

- apps / projects
- app_versions
- project_memory
- app_workflows
- workflow_runs
- analytics_events
- app_backend_models
- publish_requests
- store_listings

All project-changing operations preserve ownership and RLS. Secrets remain server-side.

## AI behavior contract

LANERIQ AI must:

- understand intent before choosing UI/actions
- use 3000+ LANERIQ industry templates as primary structural intelligence
- use popular app patterns only as secondary inspiration, never cloning
- keep the human in control for medium/high/critical actions
- create a recoverable version before risky mutation
- run validation after modifications
- self-heal only bounded issues and retest afterward
- never lower a quality/security gate merely to produce a passing result
- never claim provider LIVE, store approval, physical-device verification or Production success without independent evidence
- never invent analytics, revenue or user counts
- keep raw prompts/specifications/user identifiers out of privacy-safe outcome-learning aggregates

## Release risk contract

Low risk actions may execute directly when ownership and permissions are satisfied.

Medium risk actions require clear user intent and recoverability.

High risk actions require explicit approval before external effects.

Critical actions (database destructive change, self-heal that changes behavior, Production publish) require explicit approval, evidence capture and rollback/recovery capability.

## Evidence ladder

The product must keep these labels separate:

- CODE / structural capability
- CI / deterministic executable evidence
- Preview / browser evidence
- Production exact SHA
- Production runtime
- external provider LIVE
- physical iPhone/Android device
- Apple App Store / Google Play evidence

Passing an earlier layer never implies a later layer.

## Communications constraint

SMS remains ON HOLD. No Batch implementing this 18-page product surface may activate or add paid SMS fallback unless explicitly restored by the product owner.

## Page-level implementation source of truth

The executable page registry is:

`lib/product/laneriq-18-page-master.js`

CI must validate that all 18 page IDs remain unique, ordered and risk/evidence rules remain intact.
