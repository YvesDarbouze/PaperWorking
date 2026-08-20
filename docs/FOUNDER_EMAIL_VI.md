# Founder Email — Tiếng Việt

Copy-paste email gửi founder khi migration sẵn sàng review.

---

**Tiêu đề:** PaperWorking migration — sẵn sàng deploy preview & xin phê duyệt cutover

Chào [Tên founder],

Migration architecture trong `vu-migrate-architecture/` đã hoàn tất và đã verify tự động. Code production gốc (`PaperWorking/`) **không bị sửa**.

**Đã deliver**
- ~291 API handlers + full web app (marketing, auth, dashboard, projects, insights, reports, marketplace, vendor, admin)
- 490+ tests (Jest + integration + Playwright E2E)
- Kế hoạch cutover, template deploy, rollback procedure
- Tóm tắt: `docs/MIGRATION_SUMMARY.md`

**Cần anh/chị quyết định** (form: `docs/FOUNDER_APPROVAL.md`)
1. Chiến lược cutover (App Hosting promote vs traffic split)
2. URL preview để soak test 48h
3. Khung giờ maintenance cho production switch
4. Dual-write Firestore + Neon trong giai đoạn chuyển tiếp? (Có/Không)
5. Người on-call có quyền rollback

**Bước tiếp theo đề xuất**
1. Deploy migration lên preview (Firebase channel)
2. Chạy: `bash infrastructure/scripts/pre-cutover-checklist.sh`
3. Chạy: `npm run test:e2e` trên preview URL
4. Approve ngày cutover theo `docs/PHASE_7_CUTOVER_PLAN.md`

**Demo local**
```bash
cd vu-migrate-architecture && npm run verify
cd apps/web && npm run dev
# Admin: /login?accountType=admin&redirectTo=/admin
```

Em sẵn sàng walkthrough admin portal, scorecard metrics, hoặc Stripe/SendGrid sandbox trên call.

Trân trọng,  
[Tên bạn]

---

English version: `docs/FOUNDER_HANDOFF.md`
