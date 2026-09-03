# mockdata

Development **UI fixtures** for PaperWorking_v1 local preview and visual parity.

## Rules

- **UI / demo only** — seed payloads for dashboards, marketplace, inbox, admin ops previews, etc.
- **Never production source of truth** — do not treat these as live tenant data or authoritative business records.
- **Separate from Prisma** — `prisma/seed.ts` (and NestJS / API seed paths) remain the DB bootstrap path; this folder is not that.

## Layout

| Path | Contents |
|------|----------|
| `projects/` | Project workspace seed + list helpers |
| `dashboard/` | Portfolio command-center overview cards |
| `deals/` | Marketplace deal rows, broadcasts, messages |
| `marketplace/` | Listings, vendor directory, investors, follow state |
| `vendors/` | Vendor portal requests / profile seed |
| `team/` | Team members + seat caps |
| `inbox/` | Notification threads + chatbot demo replies |
| `insights/` | KPI / trend / comparison seed |
| `reports/` | Transaction seed + phase spend breakdown |
| `billing/` | Billing preview |
| `auth/` | Profile preview |
| `admin/` | Platform ops seed |

Apps import via relative paths (e.g. from `apps/web/lib/...` → `../../../../mockdata/...`) or through thin re-export shims that preserve historical `@/lib/.../seed-data` imports.
