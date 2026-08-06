# Walkthrough — Investor Marketplace Profiles

**Date:** 2026-08-05
**Branch:** `Yves/feature-development`
**Sprint:** UX/UI Hardening, August 2026 — Prompt 8
**Routes:** `/marketplace/investors` · `/marketplace/investors/[id]`

---

## 0. Verification Summary

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✅ **0 errors** |
| `npx jest` | ⚠️ 2887/2899 — same **2 pre-existing** DB suites, **+33 new tests** |
| `npx eslint` on all new files | ✅ **0 errors** |
| `e2e/investor-marketplace.spec.ts` | ✅ **9/9**, passed first run |
| All eight sprint e2e suites | ✅ **54/54** |
| No "Sponsor" terminology | ✅ `grep -rIo "[Ss]ponsor" src/` → **0** |

---

## 1. Two spec conflicts, resolved by decision

### Follow graph shape
The spec asked for `followers/{userId}/following/{targetId}` and
`followers/{userId}/followers/{sourceId}`. The codebase already had a working
follow system on a **flat** `investorFollowers` collection keyed
`{followerUid}_{targetUid}`, used by `src/actions/follows.ts` (433 lines), the
`FollowInvestorButton`, consent records, and E2E helpers.

**Decision: keep the flat model.** Migrating would have meant two writes per
follow and rewriting the actions, the button, and the test helpers — for no
query the product needs. Both directions are single-field queries:

```
following  →  where followerUid == me
followers  →  where targetUid  == me
```

### Routing
`/marketplace` is already the public **deal listings** page (263 lines) with its
own API. **Decision: investor discovery at `/marketplace/investors`**, profiles
at `/marketplace/investors/[id]` — exactly the profile path the spec named,
with the existing deal marketplace untouched. Nav contract §9.3 v7 is unaffected
(`/dashboard/marketplace` = Vendor, `/dashboard/deals` = Deals).

---

## 2. Data Model

```
users/{uid}
  profileType        'individual' | 'team'
  businessName?      team display name
  teamLogoUrl?
  publicBio?  location?  websiteUrl?
  strategies?        InvestmentStrategy[]
  isVerified?        admin-set, never self-serve
  publicProfile?     opt-in to appearing in discovery
  followerCount?     denormalised, atomic increment
  followingCount?    denormalised, atomic increment
  aumCents?  avgRoiPct?  showRoiPublicly?
  teamMembers?       TeamMember[]

projects/{projectId}
  isPublicOnMarketplace   boolean — DEFAULT FALSE

investorFollowers/{followerUid}_{targetUid}
  followerUid, targetUid, createdAt, consent

notifications/{id}                     ← written on follow
  userId, type: 'investor_followed', tab: 'team', title, body, href, read
```

---

## 3. Privacy Rules — the security-relevant part

### Two server-side gates

1. **Profile:** `publicProfile !== true` returns **404**, not an empty profile —
   so the route does not confirm the account exists either.
2. **Deals:** the query filters `isPublicOnMarketplace == true`, then every
   surviving document passes through `publicDealsFor`. Raw project documents
   never leave the route; they carry purchase price, loan amount, rent, seller
   name and the full ledger.

### Allowlist, not denylist
`PUBLIC_DEAL_FIELDS` names the only fields that may appear publicly. A denylist
would leak every new financial field the moment someone added one.
`FORBIDDEN_PUBLIC_DEAL_FIELDS` is asserted separately in tests as a second
tripwire.

### Scale without figures
A public card shows a **bucket** (`$250k–$500k`), never an exact number.
`bucketValue()` maps cents to six coarse bands. A test asserts the serialised
payload contains neither `400000`, `300000`, nor the seller's name.

### Non-`true` is private
`isPublicOnMarketplace` must be **exactly** `true`. `'yes'` and `1` are treated
as private — a truthiness check would have published deals on a stray string.

### Ownership on write
`PATCH /api/projects/[id]/visibility` checks the project's owner against the
**verified token** and returns 403 on mismatch. Without it, any authenticated
user could publish someone else's private deal to their own profile.

### ROI is opt-in
`publicRoi()` returns an em dash unless `showRoiPublicly === true`, so a
recorded ROI never leaks by default.

---

## 4. Component API

```ts
<InvestorProfileCard
  profile={InvestorProfile}
  isFollowing?={boolean}
  onToggleFollow?={(next: boolean) => void}   // omit → no follow control
  pending?={boolean}
  href?={string}                              // default /marketplace/investors/{uid}
  testId?={string}
/>

<InvestorAvatar profile={InvestorProfile} size?={number} rounded?={string} />

<DealVisibilityToggle
  projectId={string}
  initialIsPublic?={boolean}
  onChange?={(isPublic: boolean) => void}
/>
```

- **Avatar** falls back to initials on a gradient derived from the uid, so a
  given person always gets the same colours. `initialsFor` returns `?` rather
  than an empty chip.
- **Verification badge is BLUE** (`#60a5fa`), deliberately not green — green is
  reserved sprint-wide for CTAs, active states, and success confirmations, and
  a verified badge is none of those. Asserted by computed style in e2e.
- **Follow button** is outline by default, filled once followed, with
  `aria-pressed`.
- Teams render `businessName`; individuals render `displayName`.

---

## 5. Optimistic Follow (req 5)

Both the card grid and the profile header flip state **before** the request and
roll back on failure:

```ts
setFollowing(next);                    // immediate
try { await POST(...) }
catch { setFollowing(!next); }         // rollback
```

The server route is idempotent — following twice or unfollowing what you don't
follow is a no-op returning `changed: false`, so counts cannot double-increment.
Counts are maintained with `FieldValue.increment` **inside the same batch as the
edge**, so they cannot drift from the edges.

The follow notification is written after the batch inside its own try/catch: a
notification failure must not roll back a successful follow.

---

## 6. Requirements

| # | Requirement | Status |
|---|---|---|
| 1 | Reusable profile card, avatar/initials, badge, stats, follow | ✅ |
| 2 | Profile page: header, 5-stat bar, Deals/Activity/About tabs | ✅ |
| 3 | Deal privacy toggle, default OFF, limited public data | ✅ |
| 4 | Individual vs Investment Team, business name, logo, members | 🟡 see §8 |
| 5 | Follow graph, optimistic UI, inbox notification | ✅ |
| 6 | Discovery grid, type/location/strategy filters, search | ✅ |
| 7 | 1 col mobile · 3 col desktop, stacked stats | ✅ asserted |

---

## 7. Bug Found

The discovery filters rendered **stacked full-width, one per row** instead of a
compact row. Cause: `globals.css:1548` styles `input[type="text"]` and
`select:not(…)` with `width: 100%` **outside any cascade layer**, which beats
Tailwind's layered utilities. This is the third prompt in this sprint to hit
that rule. Fixed with inline widths, as documented in the handoff warning.

---

## 8. Not Built — req 4 partial

The **read** path for Investment Teams is complete: `profileType`,
`businessName`, `teamLogoUrl`, and `teamMembers` are modelled, returned by the
API, and the About tab renders the member list with roles and an "(invited)"
marker for pending members.

**The write path is not built.** There is no profile editor to choose
Individual vs Team, upload a logo, or invite members by email. That needs a
profile-settings surface that does not exist yet (the same gap found in Prompt 7
— the project Settings button had no destination until this prompt gave it one).

Also not built: `publicActivity` is read opportunistically and returns an empty
list when the collection is absent. Nothing writes to it yet, so the Activity
tab is structurally correct but empty in practice.

---

## 9. Files Changed

**New (9)**
- `src/lib/marketplace/investorProfile.ts` — types, redaction, avatar, filters
- `src/components/marketplace/InvestorProfileCard.tsx`
- `src/components/project/DealVisibilityToggle.tsx`
- `src/app/marketplace/investors/page.tsx`
- `src/app/marketplace/investors/[id]/page.tsx`
- `src/app/api/marketplace/investors/route.ts`
- `src/app/api/marketplace/investors/[id]/route.ts`
- `src/app/api/marketplace/investors/follow/route.ts`
- `src/app/api/projects/[id]/visibility/route.ts`
- `src/__tests__/investorProfile.test.ts` (33)
- `e2e/investor-marketplace.spec.ts` (9)

**Modified (2)**
- `src/components/project/ProjectActionBar.tsx` — `onOpenSettings` callback
- `src/app/dashboard/projects/[id]/layout.tsx` — settings drawer hosting the
  visibility toggle, giving the Settings button its first real destination

---

## 10. Screenshots

`screenshots/investor-marketplace/` — `discovery-desktop.png`,
`discovery-mobile.png`, `profile-desktop.png`.

---

## 11. Recommended Next

1. **Build the profile editor** (req 4 write path): type selection, business
   name, logo upload, member invite by email.
2. **Write `publicActivity`** on meaningful events (deal closed, followed) so
   the Activity tab has content.
3. **Reconcile the two follow buttons.** `FollowInvestorButton` (with its
   consent modal and PostHog event) and the new card/profile buttons now both
   write follows. They should share one implementation — the older one is not
   optimistic and the newer one does not capture consent.
4. **Backfill `followerCount` / `followingCount`** for any pre-existing edges,
   since the counts are new and only maintained going forward.
