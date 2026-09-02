# Big Moon Valley Shell Scope

LANERIQ AI uses Big Moon Valley as its signature product-shell scene. This document records the visual ownership boundary so future UI work can improve the LANERIQ workspace without overwriting customer-generated product design.

## LANERIQ-owned shell surfaces

The signature scene and premium glass system may be applied to:

- Homepage and fresh-session first paint
- Build Progress and AI Planning
- Live Preview outer workspace
- Release Center
- Store Publish workspace
- Store Readiness dock
- No-code Editor / AI Modify outer workspace
- Authenticated Project Dashboard

## Customer-owned generated surfaces

The signature shell must not override generated customer output. In particular:

- Generated App routes keep the saved project design system and wallpaper.
- Generated Website routes keep the saved project design system and wallpaper.
- The Editor's device preview continues to use `wallpaperStyle(currentWallpaper, { primary, accent })` from the saved project specification.
- Release and Dashboard links may navigate to customer previews, but LANERIQ shell CSS must not target those customer routes.

## Regression gates

The Big Moon Valley GitHub workflow runs dedicated contracts for:

1. Homepage / first-paint signature and cinematic composition.
2. Planning / Preview journey continuity.
3. Release / Publish / Store Readiness shell scope.
4. Editor / Project Dashboard shell scope and customer-preview isolation.

The workspace and release contracts inspect every selector in their final CSS layers and reject selectors outside their approved LANERIQ roots. Existing Auth, ownership, AI Modify, version-history and publishing truth-boundary contracts remain authoritative.

## Evidence boundary

Passing these contracts proves code-level visual ownership and build stability. It does not substitute for real-device visual review, external provider delivery evidence, or Apple / Google store approval evidence.
