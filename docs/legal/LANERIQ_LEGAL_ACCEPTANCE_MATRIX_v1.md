# LANERIQ AI Legal Acceptance & Signature Matrix

**Version:** LANERIQ-LEGAL-MATRIX-v1-DRAFT  
**Status:** DRAFT — LEGAL REVIEW REQUIRED BEFORE PRODUCTION ENFORCEMENT

This Matrix defines the intended product-level acceptance strength for each legal document. It is an implementation control, not a substitute for legal review.

## 1. Acceptance levels

### Level A — Notice only
Used where the user primarily needs clear disclosure rather than a contractual signature.

Evidence target:
- document/version served;
- timestamp;
- account/session where available.

### Level B — Clickwrap acceptance
Used for ordinary platform contractual terms.

Evidence target:
- authenticated account ID;
- exact document version;
- affirmative unchecked-by-default `I Agree` action;
- timestamp;
- tamper-evident acceptance record.

### Level C — Strong electronic acceptance
Used for material commercial obligations.

Evidence target:
- all Level B evidence;
- legal/display name confirmation;
- project/order/agreement ID;
- final price or obligation snapshot;
- MFA/OTP or comparable re-authentication appropriate to risk;
- immutable document hash;
- evidence that material terms were presented before signing.

### Level D — Bilateral electronic signature / transfer execution
Used for project ownership, copyright/IP assignment, high-value asset transfers or other transactions where written execution strength is critical.

Evidence target:
- Seller and Buyer authenticated separately;
- both signer identities recorded privately;
- exact Agreement Version and hash;
- Project ID and Transaction ID;
- Asset Schedule hash;
- price/currency snapshot;
- affirmative signature act by each party;
- timestamp for each signer;
- MFA/OTP or equivalent risk-based verification;
- completion conditions and final status;
- tamper-evident audit history;
- Handover & Acceptance Certificate.

A photographed handwritten signature is not required for the standard intended workflow and must not be published in the public repository.

## 2. Document matrix

| Document / Policy | Intended level | Who accepts/signs | Production rule |
|---|---:|---|---|
| Privacy Notice | A / acknowledgement where required | User receives notice | Must be available before relevant collection; consent separate where legally required |
| Cookie / optional tracking consent | Separate consent where legally required | User | No pre-ticked optional consent |
| Platform Terms of Service | B | Account user | Required before account/service contractual activation |
| Acceptable Use Policy | B, incorporated into Terms | Account user | Version linked to Terms acceptance |
| Refund/Cancellation Policy | B / checkout acknowledgement | Purchaser | Material refund rules shown before payment |
| Marketplace Terms | B | Marketplace Seller/Buyer | Required before listing/buying features |
| Buyout License | C | Project owner | Must bind exact Project ID, price, terms version and payment record |
| Project Portability / Revenue Share Agreement | C | Project owner / authorized business signer | Must bind exact Project ID, revenue-share version and continuing obligations |
| App Sale Asset Schedule | D attachment | Seller + Buyer | Final hash locked before sale signatures complete |
| App Sale & IP Assignment Agreement | D | Seller + Buyer | Required for ownership/IP transfer |
| App Sale Data Transfer Addendum | D when personal data transfers | Seller + Buyer and any required business roles | Must complete before LANERIQ-assisted personal-data export |
| Handover & Acceptance Certificate | D completion evidence | Buyer acknowledgement + transaction system | Issued only after completion conditions |
| Enterprise negotiated agreement | C or D based on scope | Authorized business signers | Separate authority verification required |
| Operator successor-company novation/accession | C or D as counsel determines | Affected contracting parties where required | 1,000 users is readiness trigger only; no automatic novation |

## 3. High-risk actions requiring re-authentication

The following should require recent authentication and, when proportionate, MFA/OTP or another step-up control:

- signing App Sale/IP Assignment;
- accepting a material revenue-share obligation;
- activating a Buyout licence;
- transferring project ownership;
- exporting a customer/end-user personal-data dataset;
- changing payout destination for a pending marketplace sale;
- changing signer identity or business authority near transaction completion; and
- approving a lawful reversal/reassignment of a completed App Sale.

## 4. Evidence integrity

The acceptance system should store enough evidence to establish what the signer saw and approved without storing unnecessary sensitive data.

Recommended fields:

- acceptance/signature record ID;
- user/account ID;
- private signer legal-name reference;
- role/authority declaration where relevant;
- agreement type;
- agreement version;
- document hash;
- project/order/transaction ID;
- timestamp in UTC;
- risk-verification event reference;
- completion state;
- superseded/revoked status where legally applicable; and
- audit-chain reference.

Do not place passwords, raw OTP values, full payment-card data, government ID images, handwritten signature images, private residential addresses or private authentication secrets in the legal evidence table or public repository.

## 5. Contract presentation rules

For stronger enforceability and fairness, the product should:

1. show material commercial terms before the final acceptance action;
2. avoid pre-checked boxes for contractual consent;
3. make price, duration, renewal, revenue share, ownership transfer and non-refundable completed-service terms conspicuous;
4. prevent acceptance when required schedules are incomplete;
5. preserve the exact signed version rather than silently replacing it with later text;
6. require renewed acceptance for material amendments where legally required;
7. provide an accessible copy/receipt after execution; and
8. provide a correction route for signer identity or authority errors before completion.

## 6. Personal operator privacy

Until a successor company transition is complete, the contracting operator is the individual identified in the private execution record, trading publicly as LANERIQ AI.

The public repository and ordinary user interface should not expose private residential address, government ID number, signature specimen, private banking details or unnecessary identity documents.

Legally required business/notice information must still be provided through an appropriate private or public legal channel as advised by counsel.

## 7. 1,000-user transition trigger

Approximately 1,000 registered users is an internal operational trigger to begin successor-company readiness. It does not itself:

- create a company;
- transfer contracts;
- transfer personal data;
- transfer licences;
- release the individual operator from accrued obligations; or
- require users to pay a second fee/revenue share.

The actual transition must use legally sufficient assignment, accession, novation, notice and consent procedures as applicable.

## 8. Production legal Gate

No document marked DRAFT may be enforced as a final binding Production instrument solely because it exists in GitHub.

Before enabling enforcement, the release process must verify:

- qualified Malaysian legal review completed;
- final operator identity/notice details privately completed;
- governing law/dispute language approved;
- consumer-law review completed;
- PDPA/data-flow review completed;
- payment/refund terms aligned with actual processor;
- exact final document versions frozen;
- acceptance/signature evidence implementation tested;
- legal pages reachable in Production; and
- runtime records preserve the exact accepted version/hash.

## 9. Statutory design notes for counsel

The final implementation should be checked against then-current Malaysian law, including the Electronic Commerce Act 2006, Copyright Act 1987, Consumer Protection Act 1999 and Personal Data Protection Act 2010 as amended, plus applicable regulations, commencement orders, Commissioner guidance and payment/app-store requirements.
