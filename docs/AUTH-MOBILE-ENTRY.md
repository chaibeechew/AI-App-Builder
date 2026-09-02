# LANERIQ mobile auth entry recovery

The `/auth` client must never remain on `Checking your session…` indefinitely.

Contract:
- LANERIQ Session is checked first.
- A valid LANERIQ Session redirects to the safe internal destination.
- 401/invalid/missing Session immediately reveals the sign-in form.
- Client/network anomalies are bounded by a 3.5 second abort plus a 4 second UI fail-open fallback.
- Email verification does not initialize the legacy compatibility browser client.
- The compatibility browser client is lazy-loaded only after an explicit WhatsApp verification attempt.
- Protected routes remain protected; fail-open here means showing the sign-in form, never granting access.
