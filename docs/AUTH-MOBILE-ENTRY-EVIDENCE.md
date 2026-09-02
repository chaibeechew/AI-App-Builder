# Production evidence: mobile auth stall

Observed on 2026-09-02 production:
- `/auth` rendered the LANERIQ loading screen on iPhone.
- Production `/api/auth/session` returned HTTP 401 repeatedly and promptly for the affected signed-out browser.
- Therefore the server-side Session endpoint was responsive; the defect was the client remaining in the checking state after a signed-out response.

Fix:
- bound the Session fetch with AbortController;
- add a UI fail-open timer that reveals the login form after a bounded wait;
- remove eager compatibility-client initialization from Email auth entry;
- lazy-load the compatibility client only for explicit WhatsApp verification.
