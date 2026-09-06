# PaperWorking V1 — Documentation Index

> **Stack (v0 production):** Firebase Auth + Firestore + App Hosting (Next.js BFF) + Nest API (Stripe webhooks / health).  
> Các tài liệu migration Neon/Supabase/V0 parity đã được gỡ — chỉ giữ phần cần cho phát triển và vận hành.

---

## Kiến trúc & dữ liệu

| Doc | Mục đích |
|-----|----------|
| [ARCHITECTURE_TREE_FIREBASE.md](./ARCHITECTURE_TREE_FIREBASE.md) | Sơ đồ layer Firebase-centric (FE → BFF → Firestore/Storage) |
| [FINAL_FIRESTORE_ARCHITECTURE_v1.md](./FINAL_FIRESTORE_ARCHITECTURE_v1.md) | Quyết định kiến trúc Firestore (collections, membership, RBAC) |
| [FIRESTORE_COLLECTION_BLUEPRINT_v1.md](./FIRESTORE_COLLECTION_BLUEPRINT_v1.md) | Schema/field blueprint từng collection |
| [FIRESTORE_V1_COLLECTIONS_SETUP_GUIDE.md](./FIRESTORE_V1_COLLECTIONS_SETUP_GUIDE.md) | Hướng dẫn bootstrap Firestore trên Console (tiếng Việt) |

---

## Auth, session & bảo mật

| Doc | Mục đích |
|-----|----------|
| [PHASE_9A_SHARED_SESSION_AUTHZ_WIRING.md](./PHASE_9A_SHARED_SESSION_AUTHZ_WIRING.md) | Luồng session cookie + authz wiring |
| [PHASE_9C_GET_AUTH_SESSIONS.md](./PHASE_9C_GET_AUTH_SESSIONS.md) | API liệt kê / thu hồi session |
| [RBAC.md](./RBAC.md) | Ma trận quyền platform (accountType × permission) |
| [role.md](./role.md) | Spec vai trò org/project (TEAM_LEAD, TEAM_MEMBER, …) |
| [API_SECURITY_MATRIX.md](./API_SECURITY_MATRIX.md) | Endpoint × auth method × CSRF |

---

## Domain features

| Doc | Mục đích |
|-----|----------|
| [REIL.md](./REIL.md) | REIL phases & financial workflow |
| [INSIGHTS.md](./INSIGHTS.md) | Portfolio / project insights & KPIs |

---

## API & triển khai

| Doc | Mục đích |
|-----|----------|
| [ROUTES_AND_APIS.md](./ROUTES_AND_APIS.md) | **Tổng hợp toàn bộ page routes + BFF API + link footer** |
| [list_APIs_.md](./list_APIs_.md) | Inventory chi tiết 297 handler `@paperworking/api` |
| [NEST_API_CLOUD_RUN.md](./NEST_API_CLOUD_RUN.md) | Deploy Nest API lên Cloud Run |
| [PHASE_B14_FIREBASE_STORAGE_DEPLOYMENT.md](./PHASE_B14_FIREBASE_STORAGE_DEPLOYMENT.md) | Firebase Storage + App Hosting IAM |
| [STRIPE_PRODUCTION_CHECKLIST.md](./STRIPE_PRODUCTION_CHECKLIST.md) | Go-live Stripe |
| [PRODUCTION_LAUNCH_CHECKLIST.md](./PRODUCTION_LAUNCH_CHECKLIST.md) | Checklist launch tổng hợp |

---

## Scripts liên quan (ngoài `docs/`)

```bash
# Remap user documents: UID → email document id
node --env-file=.env scripts/firestore-remap-users-to-email-ids.mjs --dry-run

# Deploy Firestore rules + indexes
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```
