# Founder Handoff — Migration Ready for Preview

Use this when notifying the founder that the migration workspace is ready for review and cutover approval.

---

## Email template

**Subject:** PaperWorking architecture migration — ready for preview & sign-off

Hi [Founder name],

The isolated migration build in `vu-migrate-architecture/` is complete and verified. Production source (`PaperWorking/`) was not modified.

**What’s ready**
- ~291 API handlers (`apps/api/`) + full web surface (`apps/web/`)
- 485+ automated tests (Jest + integration + Playwright E2E)
- Cutover plan, deploy templates, and rollback procedure
- Executive summary: `docs/MIGRATION_SUMMARY.md`

**What we need from you**
Please review and sign: `docs/FOUNDER_APPROVAL.md`

Decisions required:
1. Cutover strategy (App Hosting promote vs traffic split)
2. Preview URL for 48h soak test
3. Maintenance window for production switch
4. Dual-write OK for projects during transition? (Y/N)
5. Rollback on-call contact

**Suggested next steps**
1. Deploy migration stack to preview (Firebase App Hosting channel)
2. Run: `bash infrastructure/scripts/pre-cutover-checklist.sh`
3. Run: `npm run test:e2e` against preview URL
4. Approve cutover date per `docs/PHASE_7_CUTOVER_PLAN.md`

**Local demo**
```bash
cd vu-migrate-architecture
npm run verify
cd apps/web && npm run dev
# Login: /login?accountType=admin&redirectTo=/admin
```

Happy to walk through the admin portal, scorecard metrics, or Stripe/SendGrid sandbox flows on a call.

Best,  
[Your name]

---

## Attachments checklist

- [ ] `docs/MIGRATION_SUMMARY.md`
- [ ] `docs/FOUNDER_APPROVAL.md`
- [ ] `docs/PHASE_7_CUTOVER_PLAN.md`
- [ ] Latest `npm run verify` output (paste in thread or CI link)

---

## Preview deploy command reference

See `infrastructure/README.md` — deploy to preview **only** until sign-off.

*Do not modify production `apphosting.yaml` or DNS until approval.*
