# Zillow API Integration Roadmap & Partner Track

This document outlines the strategic partner APIs offered by Zillow Group, mapping them to existing features within PaperWorking. Since Zillow gates its APIs behind a closed partnership approval process, this document serves as a blueprint for business readiness, licensing, and compliance requirements.

---

## 1. Mortgage Rates: Get Current Rates / Rate Cloud API
*   **Feature Mapping**: Lender Rates Feature (`#12` / `src/lib/providers/lenderRates.ts`)
*   **API Product**: Zillow Rate Cloud / Get Current Rates API
*   **Purpose**: Replaces the admin-editable Firestore system config with live real-time rate quotes.
*   **Integration Priority**: **Highest (Primary Candidate)**
*   **Application Link**: [Zillow Group Mortgage Solutions](https://developer.zillowgroup.com/)
*   **Requirements & Access Gating**:
    *   **NMLS Registration**: The company must hold an active NMLS (Nationwide Multistate Licensing System) license number, or operate as an approved financial technology partner under a licensed leadInvestor.
    *   **Mortech / Custom Quotes Partnership**: Access is generally restricted to active participants in Zillow's Custom Quotes or Mortech pricing engine platforms.
    *   **Partner ID**: Authentication requires a verified `Partner ID` header.
    *   **Compliance & Brand Guidelines**: Co-branding requirements dictate displaying the "Powered by Zillow" logo and linking directly to Zillow's mortgage disclosure pages.

---

## 2. Active Inventory: MLS Listings API
*   **Feature Mapping**: Sourcing & Active Inventory Search (`src/lib/providers/listings.ts`)
*   **API Product**: Bridge Interactive API (a Zillow Group subsidiary) / Zillow MLS Partner Feed
*   **Purpose**: Increases listing coverage/breadth alongside current RentCast listing queries.
*   **Integration Priority**: Medium
*   **Application Link**: [Bridge Interactive Developer Platform](https://www.bridgeinteractive.com/)
*   **Requirements & Access Gating**:
    *   **MLS Membership**: The company must hold active membership in local MLS boards.
    *   **IDX / VOW Data Access Agreements**: Requires signing individual Internet Data Exchange (IDX) or Virtual Office Website (VOW) tri-party data agreements (MLS, Broker, and Bridge Interactive).
    *   **Broker Approval**: The managing broker of record must approve the data licensing application.
    *   **Approved Data Schema**: Data is delivered via standardized RESO Web API (Web API OData v4) formats.

---

## 3. Valuation: Zestimates API
*   **Feature Mapping**: Property Valuation History & AVM (`src/lib/providers/property.ts` / `getValueEstimate`)
*   **API Product**: Zestimate API
*   **Purpose**: Provides secondary valuation estimate and appreciation history alongside RentCast AVM.
*   **Integration Priority**: Low (RentCast AVM serves as primary due to open access)
*   **Application Link**: [Zillow Data & APIs](https://developer.zillowgroup.com/)
*   **Requirements & Access Gating**:
    *   **ZWSID**: Requires a Zillow Web Services Identifier (ZWSID) issued upon partner verification.
    *   **Display Requirements**: Zillow requires displaying the specific Zestimate logo, date of the estimate, and links to the Zestimate Valuation Range, "How Zestimate Works", and Zillow's terms of use.
    *   **Commercial Agreement**: Unlimited high-throughput or batch queries require a customized commercial contract.

---

## 4. Property Metadata: Public Records API
*   **Feature Mapping**: Property Enrichment (`src/lib/providers/property.ts` / `getFacts`)
*   **API Product**: Zillow Property Details API
*   **Purpose**: Redundancy for property attributes (beds, baths, square footage, tax assessments).
*   **Integration Priority**: Low
*   **Application Link**: [Zillow Group Developer Platform](https://developer.zillowgroup.com/)
*   **Requirements & Access Gating**:
    *   **Enterprise License**: Non-consumer use cases require a commercial platform agreement.
    *   **Strict Storage Limits**: Heavy caching restrictions apply; data must be refreshed on-demand and cannot be stored permanently to build competitive property databases.

---

## 5. Architectural Design for Vendor Neutrality

To ensure that integrating Zillow is a purely additive adapter pattern, the following structural guidelines must be enforced:
1.  **Strict Interface Adherence**: All adapters must satisfy `PropertyDataProvider`, `MarketDataProvider`, or `LenderRateProvider` respectively.
2.  **No Vendor-Specific Leaks**: Avoid returning raw vendor schemas. Map response fields to standard interfaces (e.g. `LenderRate`, `PropertyFacts`, `Comp`, `MarketStats`) at the adapter boundary.
3.  **Unified Error Mapping**: Catch HTTP/vendor errors and map them to unified provider errors (e.g. rate limit, auth error, not found) instead of propagating raw Axios/fetch exceptions.
