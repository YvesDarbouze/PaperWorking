# PaperWorking V1 — RBAC Matrix

Platform permissions from `apps/api/src/authz/permissions.ts`.  
Org roles from `apps/api/src/authz/org-roles.ts`.  
Resource ACL from `AuthorizationService`.

## Platform account types

| accountType | Description |
|-------------|-------------|
| `admin` | DB-assigned only (`User.accountType=admin` or `User.role=admin`). Client cannot set admin. |
| `investor` | Default platform user |
| `investment_team` | Limited investor ops (no delete deals, no billing.manage) |
| `vendor` | Read projects/deals; vendor portal routes |

## Platform permission matrix

| Permission | admin | investor | investment_team | vendor |
|------------|-------|----------|-----------------|--------|
| projects.read/create/update/delete | ✓ | ✓ | read/create/update | read |
| deals.read/create/update/delete | ✓ | ✓ | read/create/update | read |
| team.read/manage | ✓ | ✓ | read | — |
| billing.read/manage | ✓ | ✓ | read | read |
| admin.access | ✓ | — | — | — |

`isAdmin` bypasses all permission checks.

## Organization roles (team manage only)

Roles that **can manage team** (`assertTeamManage`): CEO, President, Admin, Owner, Lead Investor.

Non-manage: CFO, COO, Deal Lead, Contributor, Member, Analyst, Viewer.

Org roles do **not** grant platform permissions.

## Resource scope rules

| Resource | Read | Write | Scope |
|----------|------|-------|-------|
| Organization | member/owner | create: any authed user; manage members: org manage role | `resolveUserOrgIds` |
| Project | owner, investor, project member, org member | update: same ACL | `assertProjectAccess` |
| Deal | creator; marketplace if published+marketplace visibility | update: creator | `assertDealAccess` |
| Vendor | org members | create: trusted org | org-scoped list |
| Message | thread participants | create: org-shared recipient or existing thread | `assertMessageRecipientAllowed` |
| Inbox | recipient | create: org-shared recipient | `resolveInboxRecipientUid` |
| Subscription | self | manage: self | `userId = session.uid` |
| Admin | admin.access | admin.access | global |

## Never authorization sources

- `__acct` / `__sub` cookies
- localStorage account type
- Request body `userId`, `accountType`, `role`
- Frontend route guards (UX only)
