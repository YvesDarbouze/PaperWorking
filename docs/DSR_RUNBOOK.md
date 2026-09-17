# PaperWorking Data Subject Request (DSR) Operator Runbook

**Operational Scope:** Fulfillment of Data Subject Access Requests (DSAR / GDPR Art. 15, CCPA § 1798.110) and Right to Erasure / Deletion (GDPR Art. 17, CCPA § 1798.105, and ~20 US State Privacy Laws).  
**Compliance Clock:** Maximum 45 calendar days from receipt (with a single 45-day extension permitted only for complex requests upon formal written notice to the user prior to day 45).

---

## 1. Statutory Foundations & Principles

PaperWorking resolves the tension between **immutable underwriting projection seals** and **privacy erasure rights** through architectural decoupling:
- **Financial Immutability as a Take-Away Feature:** When an investor exports their data under Article 15, they receive an export bundle containing their underwriting snapshots, the SHA-256 seal hashes, and step-by-step cryptographic verification instructions. External counterparties (banks, LP investors, appraisers) can independently verify that PaperWorking has never modified the deal metrics.
- **Crypto-Shredding of Personal Data:** Property addresses sealed inside snapshot bodies are envelope-encrypted per user with a 256-bit AES-GCM Data Encryption Key (DEK). Erasure permanently destroys the user's DEK, making property addresses mathematically unrecoverable while leaving the sealed ciphertext unchanged so the SHA-256 seal continues to validate.
- **Identity Decoupling:** Personal identity (`userId`, display addresses) resides in a mutable mapping table (`SnapshotIdentityMapping`) that is deleted during erasure, converting snapshots into anonymous shells.

---

## 2. Request Intake & Verification Procedure

Before processing any DSR export or erasure:
1. **Identity Verification:**
   - **Authenticated Session:** If submitted via in-app settings (`/settings/security`), the request is verified via Firebase Authentication session claims.
   - **Offline / Email Requests (`privacy@paperworking.co`):** Operators must verify the requester's identity using two-factor email verification or government-issued ID matching registered account records before proceeding.
2. **Statutory Exception Check (Pre-Erasure Audit):**
   - Check if the user is a designated project owner of active closing settlement or tax basis records governed by **26 U.S.C. § 6001** (e.g., Form 1099-S, official ALTA/HUD settlement statements).
   - If statutory tax records exist, explain to the consumer that statutory basis records are retained pursuant to CCPA § 1798.105(d)(8) and GDPR Art. 17(3)(b) until the statutory 3-year window expires, while all other personal data is immediately shredded.

---

## 3. Article 15: Data Subject Access / Export Execution

### Execution via Operator CLI or API
To generate and download the export bundle for user `<UID>`:
```bash
curl -X POST "https://api.paperworking.co/api/account/data/download" \
  -H "Authorization: Bearer <OPERATOR_OR_USER_TOKEN>" \
  -o "PaperWorking_DSR_Export_<UID>.zip"
```

### Export Bundle Contents
The generated ZIP archive contains:
1. `manifest.json`: Metadata inventory, export timestamp, record counts, and compliance standard reference.
2. `snapshots.json`: Full underwriting history, deal parameters, outputs, assumptions, `integrityHash`, and verification command lines.
3. `consents.json`: Complete history of signed clickwrap consents (ToS, Privacy Policy, Plaid notices).
4. `plaid_connections.json`: Connected financial institutions metadata (with access tokens redacted).
5. `README_VERIFICATION.txt`: Human-readable cryptographic verification manual.

### External Immutability Verification Guide
To prove to a lender or investor that a snapshot was not altered:
```bash
# 1. Unzip the export bundle
unzip PaperWorking_DSR_Export_<UID>.zip

# 2. Extract canonicalPayloadString from any snapshot in snapshots.json
# 3. Compute SHA-256 hash using OpenSSL or shasum:
echo -n '<canonicalPayloadString>' | shasum -a 256

# 4. Confirm output matches integrityHash in snapshots.json
```

---

## 4. Article 17: Right to Erasure / Deletion Execution

### Execution via Operator CLI or API
To trigger the automated deletion cascade for user `<UID>`:
```bash
curl -X POST "https://api.paperworking.co/api/account/data/delete" \
  -H "Authorization: Bearer <OPERATOR_OR_USER_TOKEN>" \
  -H "Content-Type: application/json"
```

### The 7-Step Deletion Cascade
The endpoint runs the following atomic pipeline:
1. **Crypto-Shredding:** Destroys user's 256-bit DEK in `UserEncryptionKey`. Ciphertext envelopes in sealed snapshots become permanently unreadable.
2. **Identity Decoupling:** Deletes all rows for `userId` in `SnapshotIdentityMapping`.
3. **Shell Anonymization:** Nullifies `createdByUid` on `CalculatorSnapshot` records.
4. **Plaid Credential Purge:** Executes `hardDeleteWithTransactionalAudit` on all linked Plaid items, destroying access tokens and credentials.
5. **Document Vault Deletion:** Deletes non-tax documents (PSAs, bids, inspection reports) from Cloud Storage.
6. **Support & Feedback Scrubbing:** Deletes callback requests and scrubs user identifiers from support tickets.
7. **Compliance Audit Event:** Writes `user.dsr_erasure` event to Neon `audit_events` recording completion timestamp and crypto-shredded status.

---

## 5. Post-Erasure Verification Checklist

An operator must perform post-erasure verification:
1. [ ] Querying `GET /api/calculator/snapshots` for the erased `userId` returns **0 records**.
2. [ ] Querying `UserEncryptionKey` for `userId` shows `status: 'destroyed'` and empty `encryptedDek`.
3. [ ] Attempting to decrypt any sealed address envelope throws `CryptoShreddedError`.
4. [ ] Calling `verifySnapshotIntegrity()` on the remaining anonymous snapshot shells returns **`true`** (mathematical proof of immutability).
5. [ ] Provide written confirmation of erasure to consumer within the 45-day statutory SLA.
