# Soolen AI Security Integration

This staging layer centralizes enforcement before the rules are wired into production request paths.

## Enforcement points
- Create/upload reference: explicit user action + `app-creation-reference-only` purpose.
- Device data: deny unrequested contacts, SMS, call logs, photo library, microphone, camera, files and location history.
- Cloud AI: require a user-requested task that actually needs cloud inference.
- Background AI: require explicit background consent.
- Local AI: preferred where supported.
- User content: no model training, cross-user sharing, ad targeting or sale by default.

## Next integration targets
1. Create/modify API routes call the security gate before processing references.
2. Supabase tables use per-user RLS.
3. Supabase Storage paths are user/App scoped and protected by Storage RLS.
4. AI provider adapters receive only the minimum task data.
5. App permissions request only the device capabilities needed for the selected feature.
6. Add automated tests for allowed and blocked paths before production deployment.

This architecture reduces data exposure; it cannot guarantee that a determined attacker can never compromise software.
