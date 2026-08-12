# PaperWorking Deals Marketplace Architecture & Documentation

## Overview
The **PaperWorking Deals Marketplace** is a high-performance, subscription-gated crowdfunding and real estate deal discovery platform built for real estate investors under the **Luminous Glass Design System**.

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph Client Surfaces
        P[Portfolio Dashboard /portfolio]
        DM[Deals Marketplace /dashboard/deals]
        DD[Deal Detail /deals/slug/detail]
        EXT[Tokenized External View /deals/slug/external]
    end

    subgraph Middleware & Route Protection
        RS[requireSubscriber Middleware]
        RNV[requireNonVendor Middleware]
    end

    subgraph Backend API & Webhooks
        API_D[GET/POST /api/deals]
        WEBHOOK[POST /api/webhooks/email-reply]
        RENTCAST[RentCast API Adapter]
    end

    subgraph External Email Engine
        JWT[JWT Token Generator]
        EMAIL[Dark HTML Email Sender]
    end

    P -->|Only Entry Point| DM
    DM --> RS
    DM --> RNV
    RS -->|403 if Unsubscribed| PAYWALL[Billing Paywall /dashboard/settings/billing]
    RNV -->|302 if Vendor| VENDOR[Vendor Marketplace /dashboard/marketplace]

    DM --> API_D
    DD --> RENTCAST
    DD --> JWT
    JWT --> EMAIL
    EMAIL --> EXT
    EXT --> WEBHOOK
    WEBHOOK -->|Creates DealMessage| DD
```

---

## 2. API Route Table

| Endpoint | Method | Access Guard | Description |
|---|---|---|---|
| `/api/deals` | `GET` | `requireSubscriber`, `requireNonVendor` | Retrieves published deals or user activity deals with filtering, sorting & search. |
| `/api/deals` | `POST` | `requireSubscriber`, `requireNonVendor` | Creates a new deal draft or published listing with pro-forma underwriting. |
| `/api/deals/[slug]` | `GET` | `requireSubscriber`, `requireNonVendor` | Fetches single deal detailed metrics, pro-forma calculations, and RentCast AVM estimates. |
| `/api/webhooks/email-reply` | `POST` | Public Webhook (JWT verified) | Ingests inbound email POST replies from external invitees and creates `DealMessage` records. |

---

## 3. User Role Matrix

| Surface / Action | Investor (Active Subscription) | Investor (Unsubscribed) | Vendor Role | External Invitee (Tokenized) |
|---|---|---|---|---|
| **Portfolio Entry CTA** | Visible & Active | Visible (Paywall Trigger) | Hidden / Stripped | N/A |
| **Discover Tab** | Full Access | 403 Paywall Redirect | Redirect to Vendor Marketplace | N/A |
| **Deal Detail Financials** | Unlocked | Blurred + Paywall Overlay | Redirect to Vendor Marketplace | Blurred + Paywall Overlay |
| **Submit Commitment** | Allowed | Paywall Restricted | Restricted | Paywall Restricted |
| **Email Reply Composer** | N/A | N/A | N/A | Allowed via Tokenized View |

---

## 4. Email Invitation & Webhook Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Investor as Deal Creator
    participant App as Deal Detail Surface
    participant JWT as JWT Token Generator
    participant Mail as Email Sender
    actor Invitee as External Invitee
    participant Webhook as Webhook Endpoint
    participant Thread as Unified Message Thread

    Investor->>App: Clicks "Invite Investors" & enters email
    App->>JWT: Generate 14-day tokenized payload
    JWT->>Mail: Render minimal dark HTML email template
    Mail->>Invitee: Deliver email with CTA (/deals/slug/external?token=jwt)
    Invitee->>App: Opens token link in browser
    App->>Invitee: Render Tokenized External Glass View (Blurred Financials)
    Invitee->>App: Writes reply in Glass Email Reply Composer
    App->>Webhook: POST /api/webhooks/email-reply
    Webhook->>Thread: Record DealMessage (source: email_inbound)
    Thread->>Investor: Render message in Unified Thread (slate gray left border)
```

---

## 5. Luminous Glass Design System Compliance Checklist

- [x] **Dark Canvas Background**: `#0a0a0f` base canvas on all surfaces.
- [x] **Glass Surface Panels**: `backdrop-filter: blur(12px–20px)`, `border: 1px solid rgba(255,255,255,0.06–0.10)`, `bg-[#0a0a0f]/80–90`.
- [x] **Primary Accent Accentuation**: `#34d399` teal fill for primary action buttons, active filter chips, progress bar fills, positive ROI metrics.
- [x] **Translucent Ghost Buttons**: `bg-[#34d399]/[0.08] border border-[#34d399]/25 text-[#34d399]`.
- [x] **Rounded Corner Standards**: `10px` for buttons & inputs, `12px–14px` for cards & accordions, `16px` for modals & popovers.
- [x] **Mobile First Design**: Sticky top search bar, sticky bottom glass CTA, 72px bottom navigation drawer compatibility.
- [x] **Zero Solid White Fills**: No plain `#ffffff` backgrounds or heavy drop shadows anywhere.
