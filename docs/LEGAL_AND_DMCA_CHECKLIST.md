# PaperWorking Legal & Compliance Action Checklist (Founder Tasks)

**Document Status:** Action Items for Founder & Legal Counsel  
**Review Cross-References:** Review C3.1–C3.5, Cluster 3 (The Legal Floor)  
**Last Updated:** September 2026

---

## 1. DMCA Designated Agent Registration (Statutory Safe Harbor)

Under the Digital Millennium Copyright Act (17 U.S.C. § 512(c)), online service providers that host user-generated content or user-uploaded files (such as PaperWorking's Document Vault and Marketplace project decks) are protected from monetary copyright infringement liability **only if** they have registered a Designated Agent with the U.S. Copyright Office.

### Action Items for Founder:
1. **Access the Copyright Office Directory**:
   - URL: [https://dmca.copyright.gov/osp/](https://dmca.copyright.gov/osp/)
2. **Register Service Provider Account**:
   - Enter PaperWorking's legal entity name and alternate names (DBAs).
   - Enter physical address and contact phone number.
3. **Designate the Copyright Agent**:
   - Name of Agent / Office (e.g., "Copyright Agent, PaperWorking").
   - Email address dedicated to DMCA notices (e.g., `dmca@paperworking.co` or `legal@paperworking.co`).
   - Physical mailing address and phone number.
4. **Pay Statutory Fee**:
   - $6.00 online filing fee (via credit card or pay.gov).
5. **Set 3-Year Renewal Reminder**:
   - The U.S. Copyright Office requires renewal/validation of the registration every **3 years**. Failure to renew causes the designation to expire, immediately stripping DMCA safe harbor protections.

---

## 2. Official Legal Entity Name & Registered Office Confirmation

To adhere strictly to the rule against fabricated legal claims, all current platform legal surfaces use the brand name **"PaperWorking"** with an explicit draft disclaimer.

### Action Items for Founder:
- [ ] Confirm official incorporated legal entity name (e.g., *PaperWorking, Inc.*, *PaperWorking LLC*, or state-specific corporate name).
- [ ] Provide state of incorporation and designated registered agent service address.
- [ ] Provide official designated notices mailing address for Section 8 (Governing Law & Dispute Resolution) of the Terms of Service.
- [ ] Once confirmed, update:
  - `apps/web/lib/marketing/legal-data.ts`
  - `apps/web/components/marketing/MarketingFooter.tsx`

---

## 3. Legal Counsel Review & Sign-Off (Removing Draft Banners)

All marketing Terms of Service (`/terms`) and Privacy Policy (`/privacy`) pages currently render a prominent header notice:
> **"DRAFT — pending attorney review: This document represents current platform operational terms and real data flows, subject to final legal counsel certification."**

### Action Items for Legal Counsel:
- [ ] **Arbitration & Class Action Waiver**: Review dispute resolution, mandatory binding arbitration, and venue provisions in Terms of Service.
- [ ] **Financial & Investment Disclaimers**: Verify enforceable limitation of liability clauses regarding Deal Calculator projections, algorithmic AVMs, and financial scorecards.
- [ ] **Subprocessor Roster Certification**: Confirm adequacy of the enumerated subprocessors (Plaid, RentCast, Google Places, SendGrid, Stripe, Google Cloud Platform, Neon).
- [ ] **Draft Banner Removal**: Upon written approval, set `LEGAL_DRAFT_NOTICE = ''` in `apps/web/lib/marketing/legal-data.ts` to transition policies to active status.

---

## 4. Plaid Developer Terms & Financial Integration Audit

Under Plaid's Developer Terms of Service (specifically Section 4 "End User Notice and Consent"):
- Applications must provide prominent, advance disclosure of the scope of data collected (account balances, transactions, liabilities) before initiating Plaid Link.
- Applications must provide an explicit link to the [Plaid End User Privacy Policy](https://plaid.com/legal/#end-user-privacy-policy).
- Applications must allow users to disconnect accounts and honor deletion requests.

### Implemented Controls:
- `PlaidConsentModal.tsx` prompts before Link initialization with itemized disclosures and direct link to Plaid's policy.
- Timestamped consent records are stored in PostgreSQL (`user_consents` table) with IP and User-Agent audit metadata.
- Bank disconnection invokes Plaid's `/item/remove` endpoint and executes immediate envelope encryption key shredding.

---

## 5. TCPA & Zero-SMS Compliance Notice

PaperWorking operates a **strict Zero-SMS policy**:
- The Support Call-Back form collects telephone numbers exclusively for one-time telephone customer service calls initiated by human personnel.
- Phone numbers are validated and stored in E.164 standard format (`+[country code][number]`).
- **No SMS or automated marketing messages are sent**.
- If SMS capabilities are ever considered in the future, the Telephone Consumer Protection Act (TCPA) mandates prior express written consent (PEWC) captured via separate, unchecked checkboxes with clear, conspicuous disclosures.

---

## 6. Data Subject Rights (DSR) & Crypto-Shredding Governance (Review C5.1)

Under ~20 US State Privacy Laws (CCPA/CPRA, CPA, CTDPA, VCDPA, etc.) and GDPR (Articles 15 & 17), PaperWorking enforces:
- **Statutory Clock**: Maximum 45 calendar days from intake to complete verified access or erasure requests.
- **Article 15 (Right to Access & Portability)**: Export bundle includes full deal history, SHA-256 seal hashes, and step-by-step cryptographic verification instructions so investors can independently prove projection authenticity to lenders, appraisal boards, and equity partners.
- **Article 17 (Right to Erasure & Crypto-Shredding)**: Personal property addresses in sealed snapshots are envelope-encrypted with per-user 256-bit AES-GCM DEKs. Deletion permanently destroys the user's DEK (`UserEncryptionKey`), severing identity mappings (`SnapshotIdentityMapping`) while preserving the mathematical validity of the underlying anonymous snapshot hashes.
- **Document Retention Policy**: Official closing settlement statements and tax basis records are retained for 3 years pursuant to federal tax law (**26 U.S.C. § 6001**). Private contracts (PSAs) are not artificially locked and are deletable at user discretion.
- **Operational References**:
  - Retention Schedule: [`docs/DATA_RETENTION_AND_DESTRUCTION_SCHEDULE.md`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/docs/DATA_RETENTION_AND_DESTRUCTION_SCHEDULE.md)
  - Operator Execution Runbook: [`docs/DSR_RUNBOOK.md`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/docs/DSR_RUNBOOK.md)

