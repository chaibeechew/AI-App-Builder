# LANERIQ AI Production Legal Approval Gate

**Version:** LANERIQ-LEGAL-GATE-v1-DRAFT  
**Status:** DRAFT — RELEASE CONTROL POLICY; DOES NOT ITSELF CREATE BINDING CUSTOMER TERMS

This document defines the minimum evidence required before LANERIQ AI may turn draft legal documents into binding Production self-service flows.

## 1. Default state

All legal documents marked DRAFT, LEGAL REVIEW REQUIRED, PRIVACY REVIEW REQUIRED, TAX REVIEW REQUIRED or equivalent remain **NON-BINDING PRODUCT DRAFTS** until this Gate is satisfied for the relevant document/version.

A file existing in GitHub, a successful CI run, a Vercel deployment or an AI-generated legal draft does not constitute legal approval.

## 2. Required approvals

Before a document/version becomes binding, the private legal-release record must identify as applicable:

- exact document name and immutable version/hash;
- current LANERIQ contracting party;
- qualified Malaysian legal reviewer and approval date;
- privacy/DPO review where personal-data obligations are material;
- tax/stamp-duty review where payment, transfer or instrument duties are material;
- payment/marketplace compliance review where LANERIQ handles transaction funds or regulated services;
- product owner approval;
- Production Release Control approval; and
- effective date.

The public repository should store the framework and non-sensitive approval status, not private legal opinions, identity documents or privileged communications.

## 3. Mandatory legal subjects

The relevant reviewer must confirm, where applicable:

1. contracting party identity and public trading disclosure;
2. governing law, jurisdiction and dispute process;
3. Consumer Protection Act and other mandatory consumer rights;
4. Electronic Commerce Act / electronic contracting requirements;
5. Copyright Act and IP assignment mechanics;
6. Personal Data Protection Act 2010 as amended, including current guidance/circulars;
7. controller/processor roles, breach notification, DPO and cross-border transfer obligations;
8. marketplace seller/buyer allocation of risk;
9. IP notice/takedown and designated-contact requirements;
10. refunds, cancellation and chargebacks;
11. tax, invoicing and stamp-duty treatment;
12. KYC/AML/payment licensing triggers based on LANERIQ's actual payment role;
13. limitation of liability, indemnities and non-excludable liabilities;
14. children/minor use where relevant;
15. accessibility and language/notice presentation where legally required; and
16. transition from the current individual operator to any successor company.

## 4. Acceptance UX evidence

Before activation, the product must demonstrate that the user sees or can access the exact applicable terms before acceptance and that the correct acceptance strength is used.

Evidence should include as applicable:

- clickwrap for ordinary platform terms;
- stronger electronic acceptance for material commercial obligations;
- bilateral electronic signing for App Sale/IP assignment;
- exact terms version/hash;
- timestamp;
- authenticated account/signer identity evidence;
- Project ID / Transaction ID where relevant;
- OTP/MFA for high-risk execution where required by policy; and
- tamper-evident audit history.

No photographed handwritten signature is required merely to satisfy this product Gate.

## 5. Privacy and security truth gate

Legal text may not claim that LANERIQ has a certification, encryption mode, data residency, retention period, subprocessor restriction, breach SLA, device-security control or compliance status unless the underlying Production system actually supports the claim.

Where implementation evidence is absent, the legal document must use qualified language or remain NOT READY.

## 6. Marketplace transaction gate

General self-service App sales remain disabled until the approved package covers at least:

- Marketplace Terms;
- App Sale & IP Assignment Agreement;
- Asset Schedule;
- third-party/open-source disclosure process;
- Data Transfer Addendum when personal data moves;
- Seller Verification/KYC Rules;
- IP Notice & Takedown Procedure;
- refund/chargeback process;
- tax/stamp-duty process; and
- handover/acceptance certificate.

No sale may be represented as legally completed solely because payment succeeded.

## 7. Current individual operator

Until a lawful successor-company transition is completed, the contracting operator remains the individual identified in the private contracting-party record, publicly trading as LANERIQ AI where appropriate.

The approximately 1,000-registered-user threshold is a **readiness trigger only**. It does not automatically novate agreements, transfer liabilities, change bank/tax identity or replace the contracting party.

## 8. Zero-cost staging rule

LANERIQ may prepare documents, version controls, hashes, acceptance schemas, manual review queues and compliance checklists using the existing GitHub/Vercel/Supabase architecture without purchasing new compliance SaaS.

Paid legal review, statutory duties, company registration, regulated KYC/AML, specialist e-signature or escrow/payment tooling should be activated only when legally or commercially required and separately approved.

The desire to remain zero-cost must never be used to bypass a mandatory legal filing, tax/duty, identity check or licensed activity.

## 9. Release states

Each legal module must use one of these states:

- `DRAFT`
- `LEGAL_REVIEW_REQUIRED`
- `APPROVED_NOT_ACTIVE`
- `ACTIVE`
- `SUPERSEDED`
- `SUSPENDED`

Only `ACTIVE` may be used for new binding self-service acceptance. Existing executed agreements must remain linked to the exact version accepted unless law or a valid amendment mechanism provides otherwise.

## 10. Change control

A material legal change requires a new version and assessment of whether existing users need notice, fresh acceptance or bilateral amendment.

Production Release Control must verify that the deployed effective version exactly matches the approved version/hash. A later draft commit must not silently replace the terms users accepted.

## 11. Final Production evidence

LANERIQ may announce a legal module as Production-ready only when:

**approved legal version/hash = GitHub main version/hash = deployed Production version/hash = runtime acceptance version/hash**

and all required legal, privacy, tax/payment and acceptance evidence for that module is complete.

This legal exact-version rule supplements, and does not replace, the broader LANERIQ Production exact-SHA release protocol.