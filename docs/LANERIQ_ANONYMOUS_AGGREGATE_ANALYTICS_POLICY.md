# LANERIQ AI Anonymous Aggregate Analytics Policy

Status: Active product privacy contract

LANERIQ AI product analytics follows **Anonymous Aggregate Analytics Only**.

## Allowed analytics data

Only these aggregate dimensions may be persisted:

- Project ID
- UTC calendar day
- Bounded event category
- Product channel: App, Website or Game
- Aggregate count

## Prohibited analytics data

Product analytics must not persist or derive:

- Session IDs or persistent visitor IDs
- User/customer IDs for behavioral analytics
- IP addresses
- Device or advertising identifiers
- Referrers
- Page paths or clickstream histories tied to a visitor
- Raw prompts, messages, uploaded customer content or arbitrary metadata
- Cross-session profiles, advertising profiles or behavioral scoring
- Session replay, screen recording, mouse/gesture replay or keystroke capture

## Runtime rule

The browser sends only `{ appId, eventName, channel }`. The server normalizes the event into a bounded category and atomically increments a daily aggregate counter. Legacy session-linked analytics storage is disabled.

## Product rule

Analytics may answer questions such as "How many App views happened today?" or "How many workflow completions happened this month?" It must not answer "What did this specific visitor do?" or reconstruct an individual's journey.

## Security and privacy boundary

Operational security logs required to protect LANERIQ AI infrastructure are a separate security purpose and must not be reused to build product behavior profiles. Any future proposal to add visitor-level analytics requires a new privacy review, legal review and explicit product-owner approval before implementation.
