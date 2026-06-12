# Integration Roadmap

Future third-party integrations. Each item here becomes a typed provider behind a
`ProviderInterface` + `MockAdapter` (per the Mock Conversion Rules in AGENTS.md) when
implemented — never inline API calls or commented-out fallback blocks in route handlers.

## Bank Feed / Transaction Import

**Provider candidates:** Bridge, Plaid, Finicity, MX Technologies

**Why:** Import bank transactions directly instead of manual ledger entry, enabling
automated categorization and reconciliation against the app's own ledger.

**When:** After the core ledger model is stable and the team adds subscription billing
that can cover per-connection fees.

**Planned interface shape:**

```typescript
interface BankFeedProvider {
  connectAccount(userId: string): Promise<{ linkToken: string }>;
  getTransactions(accountId: string, from: Date, to: Date): Promise<BankTransaction[]>;
  handleWebhook(payload: unknown, signature: string): Promise<void>;
}
```

**Notes:**
- The `/api/reports/[period]` route previously had a dead "Bridge API fallback" block.
  It was removed in favor of reading from the app's own ledger exclusively.
  When a real provider is integrated, wire it behind `BankFeedProvider` above and
  select it via env (`BANK_FEED_PROVIDER=bridge|plaid|mock`).
- Cache responses per the RentCast caching pattern (Firestore + TTL).
- Zillow is partner-gated; keep `BankFeedProvider` adapter-ready but do not implement.
