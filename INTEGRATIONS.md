# Integration Status Matrix

| Integration | Provider | Status | Real Adapter | Mock Adapter | Env Flag | Demo Badge | Spec Ref |
|---|---|---|---|---|---|---|---|
| Auth | Firebase Admin | ✅ Real | verifyIdToken() | Exact mock tokens (dev only) | ENABLE_MOCK_AUTH | N/A | §3.1 |
| Property Data | RentCast / ATTOM / Mashvisor | ⚠️ Partial | RentCast real; ATTOM/Mashvisor wired | Real + labeled | PROPERTY_DATA_PROVIDER | ✅ | §4.2 |
| Banking | Plaid | ✅ Real | PlaidAdapter | MockPlaidAdapter | PLAID_PROVIDER | ✅ | §4.1 |
| E-Signature | DocuSign | ✅ Real | DocuSignAdapter | MockEsignAdapter | ESIGN_PROVIDER | ✅ | §4.3 |
| Email | Resend | ✅ Real | ResendAdapter | N/A | N/A | N/A | §4.4 |
| Billing | Stripe | ✅ Real | StripeAdapter | N/A | N/A | N/A | §4.5 |
| Address | Google Places | ✅ Real | GooglePlacesAdapter | N/A | N/A | N/A | — |

## Configuration Guide

### RentCast (Recommended)
Required: RENTCAST_API_KEY
Behavior: Real AVM ranges, comps, property data. 30-day Firestore cache.

### ATTOM
Required: ATTOM_API_KEY
Behavior: Real property data. Falls back to error message if key missing.

### Mashvisor
Required: MASHVISOR_API_KEY
Behavior: Real property data. Falls back to error message if key missing.

### Mock (Development Only)
Required: PROPERTY_DATA_PROVIDER=mock
Behavior: Synthetic data with visible "Demo Data" banner. Disabled in production.
