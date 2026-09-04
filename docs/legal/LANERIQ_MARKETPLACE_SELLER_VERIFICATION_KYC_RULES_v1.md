# LANERIQ AI Marketplace Seller Verification & KYC Rules

**Version:** LANERIQ-SELLER-VERIFICATION-KYC-v1-DRAFT  
**Status:** DRAFT — LEGAL/COMPLIANCE REVIEW REQUIRED BEFORE MARKETPLACE ACTIVATION

These rules define a risk-based identity and transaction-verification framework for creators selling Apps, source code or related project assets through LANERIQ AI.

## 1. Core principle

LANERIQ AI should verify enough information to reduce fraud, unauthorized sales, account takeover, sanctions/payment abuse and identity disputes without collecting unnecessary identity data or forcing all users into expensive third-party KYC from day one.

Verification strength should increase with transaction risk.

## 2. Current zero-cost stage

Until a legally reviewed rule or transaction risk requires otherwise, LANERIQ AI may use existing platform controls at no new third-party service cost, including:

- authenticated LANERIQ account;
- verified email and/or phone where available;
- MFA/OTP for high-risk actions;
- project ownership history;
- repository/project creation evidence;
- payment-account consistency where a payment provider already supplies it;
- transaction/device/session risk signals;
- fraud, malware and account-takeover evidence;
- manual review of seller-supplied supporting evidence when necessary; and
- tamper-evident acceptance and audit records.

No paid KYC vendor is required merely because a user lists a low-risk project.

## 3. Verification tiers

### Tier 0 — Account verification
Suitable for ordinary platform use and non-transactional creation. No marketplace ownership transfer is completed at this level alone.

### Tier 1 — Standard seller verification
May require authenticated account, verified contact method, MFA for sale execution, project ownership declaration, transaction history and payout-name consistency.

### Tier 2 — Enhanced transaction verification
May be required for higher-value sales, unusual payout patterns, new accounts with high transaction value, cross-border risk, IP disputes, repeated chargebacks or other elevated-risk factors. Additional private evidence may be requested.

### Tier 3 — Regulated/specialist verification
If applicable law, a payment/escrow arrangement, sanctions/AML obligations, regulated activity or transaction scale requires specialist identity verification, LANERIQ AI may require an approved third-party KYC/AML provider before that transaction proceeds.

Tier 3 must not be represented as active until a real provider and legal basis are approved.

## 4. Seller declarations

Before completing an App Sale, the seller must affirm that:

1. the seller is the owner or authorized transferor of the listed assets;
2. the seller is not knowingly selling stolen, misappropriated or unauthorized code/content;
3. material third-party and open-source restrictions are disclosed;
4. revenue/user/traffic claims supplied for the transaction are not intentionally false or materially misleading;
5. personal data will not be transferred unlawfully; and
6. the seller will cooperate with reasonable fraud/IP verification requests.

## 5. Private identity evidence

Government-issued ID, passport details, proof of address, tax identifiers and bank/payment evidence must be collected only when justified by the relevant verification tier, provider requirement or applicable law.

Such evidence must be stored in a private legal/compliance record with restricted access. It must never be committed to the public GitHub repository or embedded in public certificates.

## 6. Holds and rejection

LANERIQ AI may place a proportionate hold or reject a transaction where evidence reasonably indicates:

- account takeover;
- false identity or impersonation;
- unauthorized project sale;
- unresolved material IP ownership dispute;
- malware or malicious backdoors;
- suspicious payment reversal/chargeback patterns;
- sanctions or regulated-payment concerns identified by an approved provider;
- forged documents; or
- refusal to provide verification reasonably necessary for the transaction risk.

A hold is a risk-control action, not a final criminal or civil finding.

## 7. Buyer protection

A seller verification badge must describe only what was actually checked. LANERIQ AI must not label a seller "fully verified," "KYC approved" or "AML cleared" unless the underlying process truly supports that claim.

Buyer due diligence remains required and seller verification is not a guarantee of future app performance, revenue or legal ownership beyond the evidence actually reviewed.

## 8. Retention

Verification records should be retained only for a documented period justified by transaction evidence, fraud prevention, payment, tax, legal claim or applicable-law needs. Deletion rules must account for legal holds and chargeback/dispute windows.

## 9. Company transition

Until the LANERIQ operator lawfully transitions to a successor company, any operator-side KYC/compliance record must continue to identify the current individual operator privately. Reaching approximately 1,000 registered users triggers company-transition readiness, not automatic substitution of the contracting party.

## 10. Legal review gate

Before marketplace Production activation, qualified Malaysian counsel/compliance advisers should confirm whether any planned payment, escrow, custody, marketplace or cross-border activity creates mandatory identity, AML/CFT, sanctions, tax-reporting or licensing obligations and which transactions require specialist KYC.