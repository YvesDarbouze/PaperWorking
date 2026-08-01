# Event Taxonomy Documentation

This document describes the unified event taxonomy used across search, Deal view, invitation, response, exchange, indication, and subscription conversion. It ensures consistent, stable naming, strictly typed properties, and complete protection of personally identifying information (PII).

---

## 1. Funnel Overview

The primary purpose of this taxonomy is to compute the 7-step conversion funnel:
1. **Search Executed** (`address_search_performed`)
2. **Deal Listing Viewed** (`deal_detail_viewed`)
3. **Invitation Opened** (`deal_invitation_viewed`)
4. **Terms Responded** (`deal_terms_responded`)
5. **Details Exchanged** (`contact_details_exchanged`)
6. **Indication Logged** (`deal_interest_indicated`)
7. **Subscription Converted** (`subscription_converted`)

---

## 2. Event Specifications

### `address_search_performed`
Triggered whenever a public or authenticated address lookup search is performed.
- **Privacy Design**: Omits the raw search query string (which contains street numbers/names) to prevent PII leakage. Uses query length and Google Place ID instead.
- **Properties**:
  - `queryLength` (`number`): The character count of the searched address.
  - `resolved` (`boolean`): Whether the address resolved successfully.
  - `placeId` (`string | null`): The non-PII Google Place ID of the location.
  - `resultCount` (`number`): The number of deal results returned.

### `deal_detail_viewed`
Triggered when a user views a deal (either public teaser or full subscriber view).
- **Properties**:
  - `listingId` (`string`): The secure, non-guessable Firestore listing ID.
  - `mode` (`'teaser' | 'subscriber'`): The detail access mode.
  - `visibilityMode` (`string`): The listing's visibility mode (e.g. `PUBLIC_SOLICITED`, `MARKETPLACE`).

### `deal_invitation_viewed`
Triggered when a guest investor opens a deal invitation link/portal.
- **Properties**:
  - `listingId` (`string | null`): The Firestore listing ID.
  - `projectId` (`string | null`): The parent project ID.

### `deal_terms_responded`
Triggered when a user responds to deal terms (accepting, declining, or counter-proposing).
- **Properties**:
  - `listingId` (`string`): The Firestore listing ID.
  - `projectId` (`string | null`): The parent project ID.
  - `isCounter` (`boolean`): Whether the response is a counter-proposal.
  - `amountCents` (`number`): The financial response amount in cents.

### `contact_details_exchanged`
Triggered when a guest investor and deal leadInvestor exchange contact card details.
- **Properties**:
  - `listingId` (`string | null`): The Firestore listing ID.
  - `projectId` (`string | null`): The parent project ID.
  - `recipientUid` (`string | null`): The user ID of the details recipient.

### `deal_interest_indicated`
Triggered when an investor records or withdraws a soft-commit indication.
- **Properties**:
  - `listingId` (`string | null`): The Firestore listing ID.
  - `projectId` (`string | null`): The parent project ID.
  - `type` (`'percentage' | 'amount'`): The indication type.
  - `currency` (`string | null`): ISO 3-letter currency code (e.g. `USD`, `EUR`), if applicable.
  - `value` (`number`): The numerical value (e.g. percentage value or raw currency amount).

### `subscription_converted`
Triggered when a user signs up for a trial or upgrades to a paid plan.
- **Properties**:
  - `plan` (`string`): The subscription plan tier name (e.g. `Pro`, `Team`).
  - `subscriptionId` (`string | null`): The Stripe/payment identifier.

---

## 3. Privacy & Session Tracking

- **Session Identifier**: The session ID is derived using a SHA-256 hash of the client's session token or temporary cookie token. Raw tokens or user credentials are **never** logged.
- **No PII**: All custom properties must be audited to ensure zero leakage of personal details (names, emails, phones, raw address text).
