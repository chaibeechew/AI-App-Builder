# Soolen AI — Highest Practical Security Baseline

This is a defense-in-depth baseline for the staging build. It does not claim absolute immunity from hacking.

## Application layer
- Central security gate for user-requested data and AI execution.
- Customer uploads are App-creation references only.
- Reject unrequested access to contacts, SMS, call logs, photo library, files, camera, microphone and location history.
- No silent background AI by default.
- No user-content training by default.
- No sale, sharing or ad targeting from user content.

## API layer
- Keep provider/API secrets server-side.
- Validate authentication and authorization on every protected operation.
- Validate request body, size, type and origin where applicable.
- Rate-limit authentication, AI generation, upload and publishing endpoints.
- Return generic errors to clients; do not expose stack traces, secrets or internal identifiers.
- Log security events without logging raw customer content or secrets.

## Database / Supabase
- Enable RLS on every user-owned table exposed to the application.
- Enforce owner/user isolation in policies; never rely only on client-side filtering.
- Separate public/publishable data from private user data.
- Use Storage policies so a user can access only their authorized objects.
- Never expose service-role credentials to the client.

## AI provider layer
- Local-first where supported.
- Cloud fallback only for a user-requested task that requires it.
- Do not send unrelated customer data to providers.
- Track provider, task, quota and failure state without retaining unnecessary content.
- Provider keys remain server-side.

## Mobile permissions
- Request only permissions needed for an explicit feature.
- Do not require contacts/SMS/location for App creation.
- Do not silently run compute-intensive AI after the user leaves/stops a task.
- Device-specific local inference must use an appropriate runtime for iOS, Android and Huawei environments.

## Security headers
Use restrictive CSP, frame-ancestors protection, nosniff, strict referrer policy, permissions policy and cross-origin isolation controls where compatible with the application.

## Release gate
Before production:
1. Run dependency and secret scans.
2. Test authentication and authorization boundaries.
3. Test RLS with two separate users.
4. Test Storage isolation.
5. Test upload type/size validation.
6. Test prompt-injection and malicious file handling.
7. Test rate limits and abuse controls.
8. Verify no client bundle contains secrets.
9. Verify security headers in production.
10. Run a manual penetration/security review before public release.
