# PaperWorking Data Retention, Crypto-Shredding & Destruction Schedule

**Document Version:** 1.0.0  
**Effective Date:** September 14, 2026  
**Regulatory Scope:** US State Privacy Laws (~20 states including CCPA/CPRA, CPA, CTDPA, VCDPA), EU GDPR (Art. 15, 17), Internal Revenue Code (26 U.S.C. § 6001), State Licensing and Contract Statutes of Limitations.

---

## 1. Executive Summary & Policy Mission
PaperWorking operates as a high-density financial operating system and project management terminal for serious real-estate investors. This policy defines the statutory retention mandates, cryptographic erasure mechanisms, and data destruction procedures governing all customer and platform data.

PaperWorking reconciles the **mathematical immutability** of deal underwriting records with **statutory privacy erasure rights** through architectural separation:
1. **Anonymous Sealed Shells:** Underwriting metrics, loan parameters, and assumptions remain permanently sealed with SHA-256 integrity hashes for historical auditability and investor verification.
2. **Crypto-Shredding of Personal Data:** PII-bearing fields inside sealed bodies (specifically property addresses) are envelope-encrypted per user using 256-bit AES-GCM Data Encryption Keys (DEKs). Upon a validated deletion request, the user's DEK is permanently destroyed, rendering the sealed ciphertext mathematically unrecoverable while preserving hash seal validity.
3. **Mutable Identity Decoupling:** All relationships connecting natural persons to sealed snapshot IDs are stored in separate, mutable mapping tables (`SnapshotIdentityMapping`) that are purged upon account erasure.

---

## 2. Statutory Legal Framework & Retention Matrix

| Data Category | Retention Schedule | Statutory / Legal Authority | Right to Erasure Treatment (DSR Art. 17 / CCPA) |
| :--- | :--- | :--- | :--- |
| **Tax Basis & Official Closing Settlements** | 3 Years from return filing date (or 6 years if >25% gross income omitted) | **26 U.S.C. § 6001**; Treas. Reg. § 1.6001-1; IRS Rev. Proc. 98-25 | **Statutory Retention Exception:** Retained pursuant to CCPA § 1798.105(d)(8) and GDPR Art. 17(3)(b) (compliance with legal tax obligation). Purged after 3-year statutory window. |
| **Calculator Snapshots (Inputs, Outputs, Metrics)** | Indefinite (Immutable Underwriting Record) | Contractual agreement & audit verification standard | **Anonymous Shell Preserved:** User identity nullified; identity mapping purged; property address crypto-shredded via DEK destruction. Integrity seal remains 100% valid. |
| **Property Addresses in Snapshots** | Active User Lifecycle + 45 days post-cancellation | Statutory privacy rights (CCPA § 1798.105; GDPR Art. 17) | **Crypto-Shredded:** DEK destroyed in `UserEncryptionKey`. Ciphertext envelope remains in sealed record, permanently unreadable. |
| **Private Real Estate Contracts (PSAs, Bids, Inspections)** | User Lifecycle (Owner Discretion) | State contract claims statutes of limitations (e.g., CA CCP § 337: 4 yrs; NY CPLR § 213: 6 yrs) | **Fully Erased:** No self-imposed lock. Deletable by project owners at will and permanently deleted from Cloud Storage during DSR erasure. |
| **Plaid Financial Credentials & Tokens** | Active Connection Lifecycle | Plaid Developer Terms & GLBA Safeguards Rule | **Hard Deleted:** Immediately purged from PostgreSQL upon bank disconnect or DSR erasure via `hardDeleteWithTransactionalAudit`. |
| **User Consents (ToS, Privacy, Clickwrap)** | 7 Years post-termination | Statute of limitations / proof of assent (E-SIGN Act, 15 U.S.C. § 7001) | **Retained as Proof:** Marked status `revoked`. PII redacted. |
| **Support Tickets & Callback Requests** | 90 Days post-resolution | Legitimate business interest / operational support | **Fully Erased:** Firestore ticket and callback documents deleted or scrubbed of telephone/email data. |
| **Audit Logs (`audit_events`)** | 3 Years | SOC 2 / Security auditability | **Anonymized:** `actorUid` retained as anonymous UUID or tombstoned; IP addresses and user agents redacted. |

---

## 3. Cryptographic Erasure & Destruction Standards
In accordance with **NIST SP 800-88 Rev. 1 (Guidelines for Media Sanitization - Section 2.4 "Cryptographic Erase")**:
1. When a user executes their statutory right to erasure, PaperWorking destroys the target encryption key (`UserEncryptionKey.encryptedDek` overwritten with zeroes/empty string, status set to `destroyed`, `destroyedAt` timestamp recorded).
2. Because the ciphertext was encrypted with AES-256-GCM using a cryptographically random 256-bit DEK, destruction of the DEK renders the ciphertext permanently unrecoverable by any party (including PaperWorking database administrators).
3. The underlying cryptographic integrity hash (`SHA-256`) of the snapshot continues to validate because the bytes of the ciphertext inside the record are unchanged.

---

## 4. Operational Runbook Integration
Operators processing Data Subject Requests must follow [`docs/DSR_RUNBOOK.md`](file:///Users/yvesdarbouze/Documents/PaperWorking_v1/docs/DSR_RUNBOOK.md) to ensure:
- Identity verification prior to export or erasure.
- Completion of exports and erasures within statutory deadlines (30 days for GDPR, 45 days for CCPA/US state laws).
- Generation of the Art. 15 Take-Away bundle including snapshot verification instructions.

---

## 5. Policy Sign-Off & Governance

This schedule has been reviewed, ratified, and signed off by platform leadership as the definitive retention and destruction standard for PaperWorking.

**Platform Founder / Principal Executive:**

*Signature:* `Yves Darbouze`  
*Title:* Founder & Principal Architect, PaperWorking  
*Date of Ratification:* September 14, 2026  
*Review Cadence:* Annual, or upon major statutory revision to US Federal or State Privacy Acts.
