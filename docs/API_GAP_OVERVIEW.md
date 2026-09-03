# API Gap Overview — PaperWorking_v1

**Cập nhật:** 2026-08-27

Tổng quan nhanh: handlers đã có trong `@paperworking/api` (~297), Next adapters trong `apps/web/app/api` (**49** route files). Nhiều path còn seed SoT (chưa Firestore live).

Companion docs:
- [API_CONNECTION_STATUS.md](./API_CONNECTION_STATUS.md)
- [API_WIRING_CHECKLIST.md](./API_WIRING_CHECKLIST.md)

---

## 1. Vừa nối (2026-08-27)

| Domain | Next routes | UI |
|---|---|---|
| **Inbox** | `GET/POST /api/inbox`, `PATCH/DELETE /api/inbox/[id]` | InboxNotificationCenter fetch + mutations |
| **Settings** | `/api/settings/[[...section]]` (GET/PUT/POST/DELETE) | ProfileSettingsPanel → `/api/settings/profile` |
| **Billing** | `/api/billing/[[...action]]` (+ summary `GET /api/billing`) | BillingPreviewPanel fetch |
| **Auth extras** | `POST /api/auth/reset-password`, `POST /api/auth/magic-link`, `GET /api/auth/sessions` | Profile sessions list |
| **Team / membership** (trước đó) | `/api/team`, project/org members, task-assignments, messages… | Team UI vẫn chủ yếu seed — route sẵn |

SoT hiện tại: in-memory seed (`lib/inbox/seed-store`, billing/settings maps, membership seed). Không xóa `packageShareTokens` / `support_taxonomy`.

---

## 2. Còn thiếu / ưu tiên cao

| Priority | Domain | Gap |
|---|---|---|
| **P0** | Projects CRUD / phases / docs / loans | ~39 handlers; UI workspace còn seed/static |
| **P0** | Stripe checkout / portal / webhook | Billing UI mock; chưa adapter Stripe thật |
| **P1** | Auth 2FA / change-password / revoke | Handler có; chưa Next route |
| **P1** | Inbox actions / backfill | `POST /api/inbox/[id]/actions`, `/backfill` |
| **P1** | Team Directory UI → `/api/team` | Route có; panel còn `TEAM_MEMBERS` seed |
| **P2** | REIL, Plaid, invitations, reconciliations… | Handler-only; UI chưa gọi |

Broken UI → missing route: **0** (các panel fallback seed nếu API lỗi).

---

## 3. Snapshot (ước lượng)

| Layer | Count |
|---|---|
| Handlers `@paperworking/api` | ~297 |
| Next route files | **49** |
| High-priority dashboard domains wired (route) | Auth core, projects GET, portfolio, marketplace, deals, vendors, admin, **inbox, settings, billing, team, messages** |
| Còn handler-only | ~240+ (nhiều cron/webhook/REIL) |

---

## 4. Gợi ý thứ tự tiếp theo

1. Wire **Team Directory** `fetch('/api/team')` (route đã sẵn).
2. Projects **create / phases / documents** adapters + UI.
3. Stripe **checkout + portal** khi sẵn keys.
4. Auth **2FA + change-password** khi Settings security cần live.
5. Cutover seed → Firestore theo [FIRESTORE_MIGRATION_MATRIX_v1.md](./FIRESTORE_MIGRATION_MATRIX_v1.md).
