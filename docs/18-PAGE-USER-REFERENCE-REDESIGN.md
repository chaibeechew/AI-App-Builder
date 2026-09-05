# LANERIQ AI — 18-Page User Reference Redesign

Status: **UI REVIEW / DO NOT MERGE AS LIVE-DATA COMPLETE**

This branch implements the layout and button geometry approved from the user's 2026-09-05 reference images.

## Locked visual rules

- Same dark navy futuristic-city visual language across all 18 primary surfaces.
- Gold LANERIQ brand treatment and primary high-confidence CTA.
- Purple AI/action CTA treatment.
- Selective glass cards with consistent radius, border, blur and spacing.
- Consistent Soolen / Pro User header chip where shown in the reference set.
- 6-step creation rail for core creation surfaces; 18-step rail for advanced project surfaces.
- One five-item bottom navigation geometry, with a centered AI/Create orb on advanced surfaces.
- Button geometry, selected states, pressed states, disabled states, focus states and toggle geometry are centralized in `app/laneriq-18-reference.css`.

## Product-policy boundaries

The screenshots are a **visual/layout authority**, not a truth authority for live product data.

- Do not reintroduce credits UI or credit accounting.
- SMS remains on hold.
- Do not invent revenue/users/analytics in Production.
- Do not claim App Store / Play Store publication before real evidence exists.
- Do not claim live provider, deployment or security status from mock data.

The current branch uses reference/demo values to review visual fidelity only. Before Production merge, each surface must be rebound to the existing owner-scoped runtime data and retain all existing permission, RLS, release, provider and quality truth boundaries.
