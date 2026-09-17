# PaperWorking RBAC Matrix & Tenant Authorization Specification

**Document Version:** 1.0.0  
**Status:** Active / Production Enforcement  
**Reviews Addressed:** Review C2.2, H-16, Probe P-02  

---

## 1. Role Hierarchy

Organizations represent the strict tenant boundary in PaperWorking. Every authenticated user interacting with organization resources is resolved through the server-side organization roster table (`organization_members`).

The platform recognizes four canonical organizational roles, ranked in order of authority:

$$\text{owner (4)} > \text{admin (3)} > \text{member (2)} > \text{viewer (1)}$$

| Role | Rank | Description | Typical Real-World Personas |
|---|:---:|---|---|
| **`owner`** | 4 | Primary account holder, legal entity controller, billing owner. Unrestricted authority over the tenant. | Managing Partner, Principal Investor, Fund Sponsor |
| **`admin`** | 3 | Organization administrators. Manages roster, team access, bank connections, and binding contract milestones. | CFO, COO, VP of Acquisitions, Lead Transaction Coordinator |
| **`member`** | 2 | Core deal operators. Full access to create underwriting models, edit operational tasks, upload project files, and generate packages. | Acquisitions Analyst, Asset Manager, General Contractor, Project Lead |
| **`viewer`** | 1 | Read-only collaborator. Can inspect approved projects, metrics, and files, but cannot perform any mutations. | Passive LP Investor, External Auditor, Board Observer |

### Role Privilege Hierarchy Rule
Any operation requiring a minimum role of $\text{Role}_R$ is permitted if and only if:
$$\text{Rank}(\text{CallerRole}) \ge \text{Rank}(\text{Role}_R)$$

---

## 2. Comprehensive RBAC Mutation Matrix

The following table defines the required minimum role (`minRole`), tenant scope, and audit event behavior for every critical mutation across PaperWorking:

| Domain | Action / Mutation | HTTP Route | Min Role | Foreign Tenant Behavior | Audit Event Logged |
|---|---|---|:---:|:---:|:---:|
| **Projects** | Delete Project | `DELETE /api/projects/[id]` | **`owner`** | **403 Forbidden** | `project.deleted` |
| **Projects** | Create Project | `POST /api/projects` | **`member`** | **403 Forbidden** | `project.created` |
| **Projects** | Update Project Meta | `PATCH /api/projects/[id]` | **`member`** | **403 Forbidden** | — |
| **Projects** | Update Pipeline Stage | `POST /api/projects/[id]/acquisition-status` | **`admin`** | **403 Forbidden** | `project.stage_transitioned` |
| **Snapshots** | Create Snapshot | `POST /api/calculator/snapshots` | **`member`** | **403 Forbidden** | `snapshot.created` |
| **Snapshots** | Mutate Snapshot | `PUT` / `PATCH /api/calculator/snapshots` | *None* | **405 / 409 (Immutable)** | — |
| **Tasks** | Create Task | `POST /api/projects/[id]/tasks` | **`member`** | **403 Forbidden** | — |
| **Tasks** | Edit Task | `PATCH /api/projects/[id]/tasks/[taskId]` | **`member`** | **403 Forbidden** | — |
| **Contract** | Change Contract Dates | `PATCH /api/projects/[id]/contingencies` | **`admin`** | **403 Forbidden** | `contract_date.changed` |
| **Documents** | Upload Document | `POST /api/projects/[id]/documents` | **`member`** | **403 Forbidden** | `document.uploaded` |
| **Documents** | Delete Document | `DELETE /api/projects/[id]/documents/[docId]` | **`admin`** | **403 Forbidden** | `document.deleted` |
| **Plaid** | Connect Bank Item | `POST /api/plaid/exchange` | **`admin`** | **403 Forbidden** | `plaid.connected` |
| **Plaid** | Pause Bank Sync | `POST /api/plaid/connections/[id]/pause` | **`admin`** | **403 Forbidden** | `plaid.paused` |
| **Plaid** | Resume Bank Sync | `DELETE /api/plaid/connections/[id]/pause` | **`admin`** | **403 Forbidden** | `plaid.resumed` |
| **Plaid** | Delete / Disconnect Item | `DELETE /api/plaid/connections/[id]` | **`admin`** | **403 Forbidden** | `plaid.deleted` |
| **Packages** | Generate Share Link | `POST /api/packages/share` | **`member`** | **403 Forbidden** | `package_share.created` |
| **Packages** | Revoke Share Link | `DELETE /api/packages/share` | **`admin`** (or creator) | **403 Forbidden** | `package_share.revoked` |
| **Roster** | Invite Team Member | `POST /api/team/invite` | **`admin`** | **403 Forbidden** | `member.invited` |
| **Roster** | Remove Member | `DELETE /api/team/[memberId]` | **`admin`** | **403 Forbidden** | `member.removed` |
| **Roster** | Change Member Role | `PATCH /api/team/[memberId]/role` | **`owner`** / **`admin`** | **403 Forbidden** | `member.role_changed` |

---

## 3. Read Operations & Tenant Scoping Rules

1. **Server-Side Membership Resolution**:
   - The user's active organization is resolved from the server roster table (`organization_members`), never blind trust in request parameters.
   - If a caller supplies an explicit query parameter `?organizationId=<orgId>`:
     - The server checks whether `<orgId>` exists in the caller's membership set.
     - If the caller is **not** a member: the route immediately returns **`403 Forbidden`** with a uniform error payload:
       ```json
       {
         "error": "Forbidden: caller is not a member of organization <orgId>",
         "code": "FORBIDDEN_ORG_MEMBERSHIP"
       }
       ```
     - **CRITICAL ANTI-PATTERN ELIMINATED:** Handlers must **never** return an empty list `[]` or `200 OK` on unauthorized cross-organization lookups.

2. **Resource-to-Tenant Binding**:
   - Every project, task, document, and snapshot is bound to an `organizationId`.
   - Before retrieving or modifying any resource by ID (`/api/projects/[id]`, `/api/calculator/snapshots/[id]`, etc.), the handler loads the resource's parent tenant and enforces membership. Foreign IDs return **`403 Forbidden`**.

3. **Public Share Links Policy (`/api/packages/share/[token]`)**:
   - `GET /api/packages/share/[token]` is a public capability endpoint designed for external lenders, appraisers, and equity partners who do not hold PaperWorking user accounts.
   - Authorization is verified against token integrity, unexpired lifespan (`expiresAt > NOW()`), and non-revocation (`revoked = false`).
   - Every external view is logged with timestamp, viewer IP/identity, and token ID.

---

## 4. Uniform Error Contract

To ensure predictable client error handling and prevent information leaks, all authorization rejections use standardized HTTP 403 response payloads:

### Non-Member Cross-Tenant Access
```json
{
  "error": "Forbidden: caller is not a member of organization <orgId>",
  "code": "FORBIDDEN_ORG_MEMBERSHIP"
}
```

### Insufficient Role Mutation Attempt
```json
{
  "error": "Forbidden: insufficient role permissions for this operation",
  "code": "FORBIDDEN_INSUFFICIENT_ROLE",
  "requiredRole": "admin",
  "currentRole": "member"
}
```

### Foreign Resource Access Attempt
```json
{
  "error": "Forbidden: resource belongs to another organization",
  "code": "FORBIDDEN_FOREIGN_RESOURCE"
}
```

---

## 5. Audit Logging Architecture (`audit_events`)

All administrative actions, membership adjustments, and destructive mutations emit an immutable row to PostgreSQL table `audit_events`:

```sql
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT,
    "project_id" TEXT,
    "actor_uid" TEXT NOT NULL,
    "actor_email" TEXT,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "from_state" JSONB,
    "to_state" JSONB,
    "ip_address" TEXT DEFAULT '127.0.0.1',
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB
);
```

This table satisfies Review C2.2, H-16, and directly coordinates with W1-09's security logging infrastructure.
