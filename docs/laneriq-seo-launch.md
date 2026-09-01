# LANERIQ AI Search Engine Launch Checklist

The SEO foundation is intentionally fail-closed during Preview. Search engines should not index a Vercel Preview, SSO-protected deployment, private project runtime or unfinished production release.

## Required public-launch environment

Set these only when the real public LANERIQ AI domain is ready:

- `NEXT_PUBLIC_SITE_URL=https://<official-domain>`
- `NEXT_PUBLIC_SEO_INDEXING_ENABLED=true`
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<Search Console verification token>`

Until both a valid HTTPS `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_SEO_INDEXING_ENABLED=true` are present, `robots.txt` disallows crawling and `sitemap.xml` returns no public URLs.

## Public SEO routes

- `/ai-app-game-website-builder`
- `/ai-app-builder`
- `/ai-game-builder`
- `/ai-website-builder`
- `/create-app-with-ai`
- `/create-game-with-ai`
- `/mobile-app-builder`
- `/no-code-ai-builder`

These pages have differentiated server-rendered content, canonical-ready metadata, Open Graph/Twitter metadata, FAQ structured data and internal linking. Do not clone them into thin keyword-only pages.

## Google Search Console launch sequence

1. Verify the final public domain.
2. Confirm `robots.txt` allows public crawling and still blocks private/auth/API/project paths.
3. Confirm `/sitemap.xml` contains the public homepage and SEO landing pages with the final domain.
4. Add the Google verification token to the production environment.
5. Submit `/sitemap.xml` in Search Console.
6. Request indexing for the homepage and the three primary pages: `/ai-app-builder`, `/ai-game-builder`, `/ai-website-builder`.
7. Monitor indexing, canonical selection, mobile usability and Core Web Vitals.
8. Add real examples, screenshots, case studies and useful editorial content over time rather than creating duplicate doorway pages.

## Truth boundary

SEO copy must never claim signed native builds, live multiplayer, live commerce/ads, measured real-device performance, official store approval or production deployment unless the corresponding external evidence exists.
