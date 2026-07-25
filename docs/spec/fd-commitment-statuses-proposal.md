# Proposed Deprecation Mapping for Commitment Statuses

As part of the Decision F-1 "Track, don't transact" alignment, we have audited the commitment statuses. The extra statuses currently in the codebase (`pledged`, `transferred`, `cleared`) contain money-movement vocabulary which violates the locked positioning of the platform (records off-platform events rather than moving money).

Here is the proposed mapping of the extra statuses onto the canonical chain:

| Current Status | Canonical Status | Deprecation & Alignment Rationale |
|---|---|---|
| `pledged` | `soft-committed` | "Pledged" is redundant with non-binding "soft-committed" interest. |
| `transferred` | `signed` with evidence / pending confirmation | "Transferred" is money-movement vocabulary. Instead of a distinct status, it should be recorded as a transition log entry (e.g. proof of off-platform transfer uploaded) on the `signed` state. |
| `cleared` | `funds-confirmed` | "Cleared" implies money transmission clearing. This is canonicalized to `funds-confirmed` off-platform with uploaded wire/ledger evidence. |

## Surfaces and Code Sites Currently Using Deprecated Statuses

### Pledged
- **UI Components**:
  - `src/components/project/CrowdfundingTracker.tsx` (real-time raise tracker)
  - `src/components/project/SubscriptionsTracker.tsx` (pipeline tracker)
  - `src/components/project/ContributionLedger.tsx` (form state defaults)
  - `src/components/findandfund/CapitalStackProgress.tsx` (progress counts)
  - `src/components/findandfund/PledgeTracker.tsx` (pledge tracking and totals)
  - `src/components/findandfund/SyndicationEngine.tsx` (investors table list)
  - `src/components/landing/MarketplacesClient.tsx` (marketplace detail rendering)
  - `src/app/invest/[token]/page.tsx` (public deal/crowdfunding intake)
- **Backend / API**:
  - `src/app/api/projects/[id]/commitments/route.ts` (POST default status)
  - `src/app/api/projects/[id]/commitments/[cId]/route.ts` (PATCH validator)
  - `src/app/api/invitations/respond/route.ts`
- **Tests**:
  - `src/__tests__/InboxActionExecution.test.tsx`
  - `src/__tests__/capitalRaiseCommitments.test.ts`
  - `src/__tests__/contributionLedger.test.ts`
  - `src/__tests__/fundSecurityAudit.test.ts`

### Transferred
- **UI Components**:
  - `src/components/project/CrowdfundingTracker.tsx` (status labels, progress calculations)
  - `src/components/project/SubscriptionsTracker.tsx` (progress tracking, highlight matches)
  - `src/components/project/ContributionLedger.tsx` (rendering/mapping)
- **Backend / API**:
  - `src/app/api/projects/[id]/commitments/route.ts` (accepted values enum)
  - `src/app/api/projects/[id]/commitments/[cId]/route.ts` (accepted values enum, privileged statuses)
  - `src/lib/firebase/syncFractionalInvestors.ts` (mapped to `'pending_subscription'`)
- **Tests**:
  - `src/__tests__/capitalRaiseCommitments.test.ts`
  - `src/actions/gate.ts` (filtered values list)

### Cleared
- **UI Components**:
  - `src/components/project/CrowdfundingTracker.tsx` (status label mapping)
  - `src/components/project/SubscriptionsTracker.tsx` (progress tracking, highlight matches)
- **Backend / Actions**:
  - `src/actions/gate.ts` (retrieves active commitments)
  - `src/app/api/projects/[id]/commitments/[cId]/route.ts`
- **Tests**:
  - `src/__tests__/capitalRaiseCommitments.test.ts`
  - `src/__tests__/fundSecurityAudit.test.ts`
  - `src/__tests__/partyPortalSecurity.test.ts`

## Next Steps
Pending founder approval, these three legacy statuses will be fully deprecated and replaced by the canonical chain:
`soft-committed → docs out → signed → funds confirmed (off-platform)`
