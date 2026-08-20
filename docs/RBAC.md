# RBAC — Roles, Permissions & Access Control

**Business source:** Yves Darbouze — Role Hierarchy v3.0 (`docs/spec/ROLE-HIERARCHY.md`)  
**Audit source:** Existing codebase (read-only)

---

## 1. User Tiers (Account Types)

These are **signup-level tiers** stored as `accountType` on user profiles.

| Tier | Code value | Creates projects | Portfolio | Assigns tasks | Deal invites | Marketplace |
|---|---|---|---|---|---|---|
| **INVESTOR** | `investor` | ✅ Solo | ✅ Own | ❌ (upgrade prompt) | ❌ | ✅ List services |
| **INVESTMENT TEAM** | `investment_team` | ✅ Team-owned | ✅ Team aggregated | ✅ | ✅ | ✅ |
| **VENDOR** | `vendor` | ❌ | ❌ | ❌ (receives only) | ❌ | ✅ List services |
| **MASTER ADMIN** | `admin` | N/A (internal) | ✅ All (admin) | ✅ All | ✅ All | ✅ Moderate |

**Prisma enum:** `AccountType { investor, investment_team, vendor, admin }`  
**TypeScript:** `src/types/user.ts` → `AccountType`

### Master Admin rules
- **Not selectable at sign-up**
- Implemented as `accountType: 'admin'` + typically `role: 'Platform Admin'`
- Full platform access; impersonation with audit log
- Admin UI at `/admin` (same domain)

---

## 2. Platform Roles (Org/Project RBAC)

Separate from account tiers — used for org and project-level permissions.

**Defined in:** `src/types/schema.ts`, `src/lib/schemas/userSchema.ts`

```
Lead Investor | Platform Admin | Admin | General Contractor |
Real Estate Agent | Accountant | Lender | Vendor | Analyst |
Observer | Standard | Guest
```

### Project member roles (Prisma)
```
OWNER | PARTNER | ANALYST | VIEWER
```

### Internal org roles
```
CEO | President | CFO | COO | Admin | Deal Lead
```

---

## 3. Permission Matrix (Account Tier)

**Source:** `src/lib/permissions.ts`

| Permission action | investor | investment_team | vendor | admin |
|---|---|---|---|---|
| Create projects | ✅ | ✅ | ❌ | ✅ |
| View portfolio | ✅ | ✅ | ❌ | ✅ |
| Assign tasks | ❌ | ✅ | ❌ | ✅ |
| Receive tasks | ❌ | ✅ | ✅ | ✅ |
| Invite to deals | ❌ | ✅ | ❌ | ✅ |
| Manage team members | ❌ | ✅ | ❌ | ✅ |
| List vendor services | ✅ | ✅ | ✅ | ✅ |
| Admin panel access | ❌ | ❌ | ❌ | ✅ |
| Impersonate users | ❌ | ❌ | ❌ | ✅ |

`hasPermission()` returns `true` for all actions when `accountType === 'admin'`.

---

## 4. Atomic Permissions

**Type:** `src/types/schema.ts`

```
projects.view | projects.create | projects.edit | projects.delete
tasks.view | tasks.create | tasks.assign | tasks.complete
reports.view | reports.generate | reports.export
billing.manage
team.view | team.invite | team.remove | team.manage_roles
vendors.manage
deal_marketplace.post
crowdfunding.manage
settings.manage
```

**Role bundles:** `src/lib/auth/RoleDefinitions.ts`  
**Runtime checks:** `src/lib/auth/AuthorizationService.ts` → `usePermissions()` hook

---

## 5. Admin Action Permissions

**Source:** `src/lib/authz/authorize.ts`

| Admin action | Platform Admin | Admin | Lead Investor |
|---|---|---|---|
| View overview | ✅ | ✅ | ✅ |
| View users | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| View subscriptions | ✅ | ✅ | ❌ |
| Manage subscriptions | ✅ | ❌ | ❌ |
| View marketplace | ✅ | ✅ | ✅ |
| Manage marketplace | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ |
| View audit log | ✅ | ✅ | ❌ |
| Purge data | ✅ | ❌ | ❌ |
| Manage roles | ✅ | ❌ | ❌ |

**Dual-control:** Granting `Platform Admin` requires second Platform Admin approver.

---

## 6. Route Guards

### Edge middleware (`src/proxy.ts`)

| Route pattern | Guard | Behavior |
|---|---|---|
| `/admin/*` | Admin role required | 403 if not admin |
| `/dashboard/*` | Session required | Vendors → `/vendor-portal` |
| `/vendor-portal/*` | Session required | Investors → `/dashboard` |
| `/deals/*` | Session + non-vendor + subscriber | Subscription gate |

### API guards

| Guard | File | Checks |
|---|---|---|
| `requireAuth()` | `auth-guard.ts` | Firebase ID token |
| `requireAdminAuth()` | `admin-guard.ts` | Admin/Superuser/Lead Investor |
| `requireProjectAccess()` | `project-guard.ts` | Owner/member/org match |
| `authorize(action)` | `authz/authorize.ts` | Fine-grained admin actions |

### Client guards

| Component | File |
|---|---|
| Admin layout | `src/app/admin/layout.tsx` |
| RoleGuard | `src/components/RoleGuard.tsx` |
| usePermission | `src/hooks/usePermission.ts` |

---

## 7. Admin Portal Structure

**Route:** `/admin` (no subdomain — preserved in migration)

| Page | Path | Access |
|---|---|---|
| Overview | `/admin` | Platform Admin, Admin, Lead Investor |
| Users | `/admin/users` | Platform Admin, Admin |
| Subscriptions | `/admin/subscriptions` | Platform Admin, Admin |
| Support tickets | `/admin/tickets` | Platform Admin, Admin |
| Audit log | `/admin/audit` | Platform Admin, Admin |
| Analytics | `/admin/analytics` | Platform Admin, Admin, Lead Investor |
| Marketplace | `/admin/marketplace` | Platform Admin, Admin, Lead Investor |
| Agent crew | `/admin/agent-crew` | Platform Admin |

**Sensitive actions:** OTP verification gate (`src/lib/admin/verificationGate.ts`) for password reset, email change, MFA reset.

---

## 8. Invitation & Access Rules (Business)

From `docs/spec/ROLE-HIERARCHY.md`:

1. To be invited to a Deal, user **must** be part of an Investment Team.
2. Non-subscribers invited to a Deal get sign-up prompt → Investor account → join Investment Team.
3. Vendors can operate standalone OR as dual-role team member.

---

## 9. Firestore Security Rules

**File:** `firestore.rules`  
**Docs:** `docs/data/firestore-rules-summary.md`

- Project access scoped by `organizationId` and `members` map
- Most admin writes via Admin SDK (server-side), not client rules
- Client reads restricted by org membership

---

## 10. Migration RBAC Target

### Target location
```
packages/shared/src/rbac/
├── account-types.ts       # INVESTOR, INVESTMENT_TEAM, VENDOR, MASTER_ADMIN enums
├── permissions.ts         # Permission matrix (ported from src/lib/permissions.ts)
├── role-definitions.ts    # Platform role bundles
└── admin-actions.ts       # Admin action matrix

packages/validation/src/
├── user-schema.ts         # Zod schemas for user/profile
└── auth-schema.ts         # Session/token validation
```

### Migration rules
1. Use **business-canonical names** in migration code (`INVESTOR` not `'investor'` in new enums — with legacy mapping)
2. Preserve `/admin` route path
3. Preserve Firebase session cookie contract during transition
4. Admin impersonation must retain audit logging
5. Dual-control for Platform Admin grants must be preserved

### RBAC test ports (Phase 4+)
- `src/__tests__/adminAuthGuards.test.ts`
- `src/__tests__/adminServerGuard.test.ts`
- `e2e/admin-auth-guard.spec.ts`

---

## 11. Known RBAC Complexity

| Issue | Detail |
|---|---|
| Dual role systems | Account tier + platform role can conflict |
| Legacy uppercase in tests | Headers use `'INVESTOR'` while DB stores `'investor'` |
| Superuser alias | `SUPERUSER` in API guards, not in Role enum |
| Vendor dual-role | Vendor can also be Investment Team member |
| Mock auth bypass | `ENABLE_MOCK_AUTH` auto-grants Platform Admin on localhost |

---

*RBAC documentation for migration planning. No authorization rules were modified.*
