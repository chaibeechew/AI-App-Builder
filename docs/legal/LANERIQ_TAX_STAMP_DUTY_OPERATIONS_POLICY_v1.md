# LANERIQ AI Tax & Stamp Duty Operations Policy

**Version:** LANERIQ-TAX-STAMP-v1-DRAFT  
**Status:** DRAFT — MALAYSIAN TAX/LEGAL REVIEW REQUIRED BEFORE COMMERCIAL ENFORCEMENT

This policy defines how LANERIQ AI should handle tax and Malaysian stamp-duty questions for subscriptions, Buyout Licenses, Revenue Share agreements, App Sale/IP transfers and related marketplace transactions.

## 1. No automatic tax conclusion

LANERIQ AI must not assume that every electronic agreement is exempt from stamp duty, that every software transaction has the same tax treatment, or that the platform can determine a party's final tax liability without the relevant transaction facts.

The applicable treatment may depend on the legal instrument, consideration, parties, jurisdiction, business status, place of execution, payment flow and then-current law.

## 2. Party responsibility

Unless a legally approved transaction term allocates a specific obligation differently:

- each party remains responsible for its own income, corporate, indirect, withholding or other taxes legally attributable to that party;
- transaction records must distinguish purchase price, LANERIQ fees, taxes, duties, processing charges, refunds and chargebacks;
- LANERIQ may collect or withhold amounts only where required by applicable law and separately approved for the applicable payment/tax flow; and
- no user-facing statement may promise "tax free" or "no stamp duty" without a verified legal basis.

## 3. Malaysian stamp duty

Where a LANERIQ-related instrument may fall within the Stamp Act 1949 or applicable schedules/orders, the responsible party must assess whether stamping, adjudication, exemption, relief or payment is required.

As of the 2026 operational model, Malaysian stamp-duty administration uses electronic e-Duti Setem / the Self-Assessment System for Stamp Duty (STSDS) in phases. LANERIQ should therefore preserve an execution-ready copy of relevant instruments, execution dates, parties, consideration and transaction identifiers so the responsible person or adviser can complete any required submission.

LANERIQ must not create a fake stamp certificate or mark an agreement "duly stamped" merely because it was electronically signed.

### 3.1 Manual-only stamp-duty control

LANERIQ AI must not automatically calculate, assess, adjudicate, submit, file, stamp, pay or authorize payment of Malaysian stamp duty.

Production handling is **MANUAL REVIEW ONLY** unless the owner later gives a separate explicit instruction and a separately reviewed legal/tax implementation is approved.

The platform may:

- record that stamp-duty review may be required;
- preserve the relevant agreement version, hash, execution date and transaction reference;
- store a manual review status and later evidence/reference supplied by the responsible person; and
- direct an authorized operator to the appropriate official process.

The platform must not:

- call a government filing or payment workflow automatically;
- debit a buyer, seller, LANERIQ account or payment method for stamp duty automatically;
- guess a stamp-duty rate or instrument classification;
- treat a signed agreement as stamped merely because electronic acceptance exists; or
- change `manual_review_only` into an automated mode through ordinary runtime logic.

Any future automated stamp-duty capability requires a new, explicit owner decision, qualified Malaysian legal/tax review, a separate Production change set and its own approval/evidence gate.

### 3.2 Buyout Customer allocation

For a LANERIQ AI Project Buyout License, the intended commercial allocation is that the **Buyout Customer bears and is responsible for any stamp duty, adjudication, filing, payment and related governmental charge attributable to that Buyout instrument**, except to the extent applicable law mandatorily allocates a particular liability to another person.

Accordingly:

- LANERIQ does not automatically assess, file, stamp or pay the Buyout Customer's stamp duty;
- LANERIQ does not automatically deduct stamp duty from the Buyout fee or charge the Customer a guessed duty amount;
- the Customer is responsible for obtaining any tax/legal advice it considers necessary and for completing any required stamping or filing within the applicable legal process;
- LANERIQ may preserve the Buyout License, License ID, Project ID, exact document version/hash, execution date and later stamping evidence supplied by the responsible person; and
- if mandatory law assigns liability differently, that mandatory legal allocation prevails over this contractual cost allocation to the extent required.

This allocation does not state that every Buyout License is necessarily chargeable, exempt or subject to a particular rate. Instrument classification remains a manual legal/tax review matter.

## 4. Instrument classification

Before the product labels an instrument for stamp-duty purposes, qualified Malaysian tax/legal review must determine the appropriate classification for at least:

- Project Portability / Revenue Share Agreement;
- Buyout License;
- App Sale & IP Assignment Agreement;
- company novation/accession instrument;
- Enterprise order forms and DPAs where relevant; and
- any security, financing, escrow or payment instrument introduced later.

Where classification is uncertain, the product should show **STAMP-DUTY REVIEW REQUIRED** rather than guessing a rate.

## 5. Stamping evidence

If stamping is required, the private transaction record should store only the minimum necessary evidence such as:

- instrument/transaction ID;
- relevant execution date;
- stamp submission/reference number;
- payment/assessment status;
- certificate or confirmation reference; and
- reviewer/processor status.

Tax identifiers, identity documents and payment information must remain private and must not be published in the public repository or public certificate.

## 6. Timing and late stamping

The product should not invent statutory deadlines or penalties. Before activation, the final workflow must use then-current HASiL rules for the specific instrument and execution circumstances.

If a transaction appears late or uncertain, the system should flag **TAX/STAMP REVIEW** and preserve the original execution evidence rather than altering dates.

## 7. Marketplace sales

For an App Sale, the transaction record should identify separately:

1. seller sale proceeds;
2. LANERIQ marketplace/transaction fees, if any;
3. third-party payment fees;
4. taxes or duties collected/withheld, if applicable and separately approved;
5. refunds or chargebacks; and
6. net payout.

This separation protects auditability and prevents platform fees from being confused with the purchase price of the App.

## 8. Cross-border transactions

Cross-border sellers and buyers may create additional withholding, indirect-tax, permanent-establishment, marketplace-reporting or foreign stamp/registration obligations. LANERIQ must not promise that Malaysian treatment resolves every foreign obligation.

High-value or cross-border transactions may be routed to a professional-review state before completion.

## 9. Zero-cost current-stage implementation

At the current pre-scale stage, this policy requires no paid tax software. LANERIQ can remain 0-new-cost by:

- storing structured transaction fields;
- preserving signed instrument versions and hashes;
- flagging tax/stamp review instead of calculating unsupported liabilities;
- linking the responsible operator/admin to official government filing channels when a real filing is required; and
- delaying automated tax engines until volume and legal requirements justify them.

Actual government duties, taxes, professional fees or statutory filing costs, when legally required for a real transaction, are not "software operating costs" and cannot be eliminated by product design.

## 10. Company transition

When LANERIQ transitions from the current individual operator to a successor Malaysian company, the tax/stamp treatment of the novation/accession and future invoicing/payment flows must be reviewed before the new entity becomes the contracting operator.

## 11. Legal review gate

Before commercial Production activation, Malaysian tax/legal professionals should confirm the applicable tax and stamp-duty treatment, party responsible for payment, filing timelines, invoice/receipt requirements, marketplace payment flow and record-retention rules for each binding instrument type.

This legal-review requirement does not authorize automatic stamp-duty calculation, filing or payment. Manual-only handling remains the default Production rule until a later explicit owner decision changes it.