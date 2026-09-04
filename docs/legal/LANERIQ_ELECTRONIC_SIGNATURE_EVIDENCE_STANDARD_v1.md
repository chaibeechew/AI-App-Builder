# LANERIQ AI Electronic Signature & Acceptance Evidence Standard

**Version:** LANERIQ-ESIGN-EVIDENCE-v1-DRAFT  
**Status:** DRAFT — LEGAL REVIEW REQUIRED BEFORE BINDING PRODUCTION USE

## 1. Principle

LANERIQ AI should not require users or the current individual Operator to upload photographed handwritten signatures into the public product repository.

For commercial agreements, the platform should use an electronic execution workflow designed to identify the signer, record affirmative approval, bind the approval to the exact document version and preserve tamper-evident evidence.

## 2. Acceptance levels

### Level A — ordinary platform acceptance

Suitable for Terms of Service, Privacy acknowledgement, acceptable-use rules and other ordinary platform notices unless applicable law or the document itself requires a stronger method.

Required evidence:

- authenticated account ID;
- exact policy/document version;
- affirmative unticked-by-default checkbox or equivalent action;
- timestamp;
- transaction/session identifier; and
- durable acceptance ledger.

### Level B — material commercial acceptance

Suitable for Buyout, Revenue Share, paid commercial addenda and similar material terms.

Required evidence:

- all Level A evidence;
- typed legal name in the private execution record;
- re-authentication or OTP/MFA;
- immutable document hash;
- transaction/project ID; and
- downloadable signed execution record/certificate.

### Level C — App Sale / IP Assignment / major ownership transfer

Required for App Sale & IP Assignment and comparable ownership transfers.

Required evidence:

- all Level B evidence for Seller and Buyer separately;
- Seller role explicitly labelled **Assignor / Seller**;
- Buyer role explicitly labelled **Assignee / Buyer**;
- both parties shown the final Asset Schedule before signing;
- explicit statement that the signer intends to be legally bound;
- separate affirmative confirmation for IP assignment;
- private signer identity record;
- signature timestamp for each party;
- OTP/MFA or equivalent high-confidence re-authentication;
- exact Agreement Version and cryptographic hash;
- immutable Project ID and Transaction ID;
- audit record of document generation, signing and completion; and
- final Handover & Acceptance Certificate.

A scanned or photographed signature image is optional only if later required by a legally reviewed external signing provider or exceptional transaction process. It is not the default LANERIQ AI signing method.

## 3. Privacy and security

Never publish or commit to a public repository:

- signature specimens;
- government ID numbers;
- private legal addresses;
- personal notice emails where not intended for publication;
- bank details;
- OTP codes;
- authentication secrets; or
- raw device fingerprint data.

Public code may contain only field definitions, placeholders and evidence rules.

## 4. Document integrity

At signing time, LANERIQ AI should freeze the exact execution copy and compute a stable cryptographic hash. Any post-signature alteration to material terms must create a new Agreement Version or amendment and require new acceptance where legally necessary.

## 5. Consent UX

The execution UI must not use pre-ticked boxes, hidden consent, deceptive button labels or silent acceptance.

For Level B and C documents, the signer should see at minimum:

- document title and version;
- counterparty identity;
- Project ID / Transaction ID;
- material price or revenue-share terms;
- asset-transfer summary where relevant;
- clear link to the full document;
- legal-name input or verified identity display;
- explicit signature/acceptance control; and
- confirmation that electronic signing creates a legally intended record.

## 6. Operator signature

The current individual LANERIQ AI Operator's legal name and execution signature must be held in private legal/signing infrastructure, not hard-coded into the public repository.

Where a LANERIQ AI countersignature is required, the signing system may apply it only after all platform approval gates are satisfied. The system must record whether the Operator personally signed, an authorized representative signed, or an approved automated corporate-signing authority was used after a future company transition.

## 7. Future company transition

After the successor company becomes the lawful contracting operator, new agreements should display the successor company's verified legal name and registration details in the private execution layer and public legal notice as appropriate.

Existing agreements must not have their historical signer or contracting party silently rewritten. Any novation/accession/assignment must create its own evidence record.

## 8. Legal review gate

Before binding Production use, Malaysian counsel should confirm the workflow against the Electronic Commerce Act 2006, Contracts Act 1950, Copyright Act 1987, Consumer Protection Act 1999 and any transaction-specific requirements, including whether any category requires a stronger form of digital signature, witness, stamp or external e-signature provider.
