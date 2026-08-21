# API Connection Status

**Last audited:** 2026-08-22

Companion to [list_APIs_.md](./list_APIs_.md). Use this to track what is live in Next.js vs still handler-only.

## Snapshot

| Layer | Count |
|---|---|
| Handlers in `@paperworking/api` (documented) | **297** |
| Next.js web adapters (`apps/web/app/api`) | **27** route files / **31** method+path |
| Adapters with UI `fetch` | **26** paths (all adapters except `/api/health`) |
| Handlers **not** wired to Next | **~269** |
| UI fetch → missing route (broken) | **0** |

## A. Connected (web route + UI)

| Method | Route | UI consumer |
|---|---|---|
| POST/DELETE | `/api/auth/session` | Login / logout |
| GET | `/api/auth/me` | AuthContext, MarketingHeader |
| GET | `/api/projects` | ProjectsListPanel |
| GET | `/api/projects/[id]` | ProjectWorkspaceProvider |
| GET | `/api/projects/[id]/kpis/current` | ProjectInsightsPanel, ProjectScorecardPanel |
| GET | `/api/portfolio/metrics` | CommandCenterPanel |
| GET | `/api/insights` | PortfolioInsightsPanel |
| GET | `/api/reports/portfolio` | PortfolioReportsPanel |
| POST | `/api/reports/generate` | PortfolioReportsPanel |
| GET | `/api/reports/[period]` | ProjectReportsPanel |
| GET | `/api/marketplace/listings` | VendorMarketplacePanel |
| GET | `/api/marketplace/profile` | CommandCenterPanel |
| GET | `/api/marketplace/investors` | VendorMarketplacePanel |
| POST | `/api/marketplace/investors/follow` | VendorMarketplacePanel, InvestorProfilePanel |
| GET | `/api/marketplace/investors/[id]` | InvestorProfilePanel |
| GET | `/api/deals` | DealsMarketplacePanel, VendorMarketplacePanel |
| GET | `/api/deals/exists` | DealDetailPanel |
| GET | `/api/vendors` | VendorMarketplacePanel |
| GET/PUT | `/api/vendor-portal/requests` | VendorRequestsPanel |
| GET/PUT | `/api/vendor-portal/profile` | VendorProfilePanel |
| GET | `/api/admin/lender-rates` | AdminLenderConfigPanel, AdminOverviewPanel |
| GET | `/api/admin/lender-checklists` | AdminLenderConfigPanel, AdminOverviewPanel |
| GET | `/api/admin/rentcast-usage` | AdminOverviewPanel |
| GET | `/api/admin/agent-crew` | AdminAgentCrewPanel, AdminOverviewPanel |
| GET/DELETE | `/api/admin/agent-crew/[id]` | AdminAgentCrewPanel |
| POST | `/api/admin/agent-crew/[id]/impersonate` | AdminAgentCrewPanel |
| GET | `/api/admin/ops?section=*` | Admin users/billing/tickets/audit/analytics/marketplace + overview KPIs |

## B. Wired but no UI (ops only)

| Method | Route | Notes |
|---|---|---|
| GET | `/api/health` | Smoke / ops — no dashboard panel |

## C. Not connected yet (handler exists, no Next adapter)

These are **not broken UI calls** — they simply have no `apps/web/app/api` route yet. Review by domain before wiring.

| Domain | Unwired handlers (approx) | Priority note |
|---|---|---|
| `projects` | 39 | High — project CRUD/phases/docs still seed/static in many places |
| `reil` | 19 | Medium — REIL engine |
| `cron` | 17 | Low — scheduled jobs |
| `invitations` | 11 | Medium — team/invite flows |
| `plaid` | 10 | Medium — banking |
| `webhooks` | 10 | Low — server-to-server |
| `reconciliations` | 8 | No dashboard UI yet — leave for later cutover |
| `auth` | 7 | No dashboard UI yet — leave for later cutover |
| `bridge` | 7 | No dashboard UI yet — leave for later cutover |
| `stripe` | 7 | Medium — payments |
| `integrations` | 6 | No dashboard UI yet — leave for later cutover |
| `rules` | 6 | No dashboard UI yet — leave for later cutover |
| `tax` | 6 | No dashboard UI yet — leave for later cutover |
| `financial-transactions` | 5 | No dashboard UI yet — leave for later cutover |
| `identity` | 5 | No dashboard UI yet — leave for later cutover |
| `inbox` | 5 | High — Inbox UI exists but still seed |
| `places` | 5 | No dashboard UI yet — leave for later cutover |
| `billing` | 4 | High — Billing UI exists (preview) |
| `calendar` | 4 | No dashboard UI yet — leave for later cutover |
| `insights` | 4 | No dashboard UI yet — leave for later cutover |
| `messages` | 4 | High — related to inbox |
| `settings` | 4 | High — Settings UI exists |
| `team` | 4 | High — Team UI exists |
| `transactions` | 4 | No dashboard UI yet — leave for later cutover |
| `account` | 3 | No dashboard UI yet — leave for later cutover |
| `packages` | 3 | No dashboard UI yet — leave for later cutover |
| `workspace` | 3 | No dashboard UI yet — leave for later cutover |
| `bids` | 2 | No dashboard UI yet — leave for later cutover |
| `data` | 2 | No dashboard UI yet — leave for later cutover |
| `e2e` | 2 | No dashboard UI yet — leave for later cutover |
| `esign` | 2 | No dashboard UI yet — leave for later cutover |
| `events` | 2 | No dashboard UI yet — leave for later cutover |
| `financial` | 2 | No dashboard UI yet — leave for later cutover |
| `invest` | 2 | No dashboard UI yet — leave for later cutover |
| `invites` | 2 | No dashboard UI yet — leave for later cutover |
| `mcp` | 2 | No dashboard UI yet — leave for later cutover |
| `notifications` | 2 | No dashboard UI yet — leave for later cutover |
| `security` | 2 | No dashboard UI yet — leave for later cutover |
| `street-view` | 2 | No dashboard UI yet — leave for later cutover |
| `user` | 2 | No dashboard UI yet — leave for later cutover |
| `worker` | 2 | No dashboard UI yet — leave for later cutover |
| `admin` | 1 | No dashboard UI yet — leave for later cutover |
| `changelog` | 1 | No dashboard UI yet — leave for later cutover |
| `closing` | 1 | No dashboard UI yet — leave for later cutover |
| `config` | 1 | No dashboard UI yet — leave for later cutover |
| `contact` | 1 | No dashboard UI yet — leave for later cutover |
| `dashboard` | 1 | No dashboard UI yet — leave for later cutover |
| `deal-analyzer` | 1 | No dashboard UI yet — leave for later cutover |
| `deals` | 1 | No dashboard UI yet — leave for later cutover |
| `drive` | 1 | No dashboard UI yet — leave for later cutover |
| `emails` | 1 | No dashboard UI yet — leave for later cutover |
| `entitlements` | 1 | No dashboard UI yet — leave for later cutover |
| `exit` | 1 | No dashboard UI yet — leave for later cutover |
| `fund` | 1 | No dashboard UI yet — leave for later cutover |
| `investor` | 1 | No dashboard UI yet — leave for later cutover |
| `lawyers` | 1 | No dashboard UI yet — leave for later cutover |
| `loi` | 1 | No dashboard UI yet — leave for later cutover |
| `map-tile` | 1 | No dashboard UI yet — leave for later cutover |
| `market-vitals` | 1 | No dashboard UI yet — leave for later cutover |
| `mls` | 1 | No dashboard UI yet — leave for later cutover |
| `permits` | 1 | No dashboard UI yet — leave for later cutover |
| `presence` | 1 | No dashboard UI yet — leave for later cutover |
| `rent-history` | 1 | No dashboard UI yet — leave for later cutover |
| `reporting` | 1 | No dashboard UI yet — leave for later cutover |
| `tasks` | 1 | No dashboard UI yet — leave for later cutover |
| `unsubscribe` | 1 | No dashboard UI yet — leave for later cutover |
| `upload` | 1 | No dashboard UI yet — leave for later cutover |
| `vendors` | 1 | No dashboard UI yet — leave for later cutover |
| `waitlist` | 1 | No dashboard UI yet — leave for later cutover |
| `zoning-scan` | 1 | No dashboard UI yet — leave for later cutover |

### C.1 Full unwired inventory (for QA)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/account/data/delete` | `handleAccountDataDeleteGet` |
| POST | `/api/account/data/delete` | `handleAccountDataDeletePost` |
| POST | `/api/account/data/download` | `handleAccountDataDownloadPost` |
| DELETE | `/api/admin/agent-crew/purge-all` | `handleAdminAgentCrewPurgeAllDelete` |
| POST | `/api/auth/2fa/[action]` | `handleAuthTwoFaPost` |
| POST | `/api/auth/change-password` | `handleAuthChangePasswordPost` |
| GET | `/api/auth/ip` | `handleAuthIpGet` |
| POST | `/api/auth/magic-link` | `handleAuthMagicLinkPost` |
| POST | `/api/auth/reset-password` | `handleAuthResetPasswordPost` |
| POST | `/api/auth/revoke` | `handleAuthRevokePost` |
| GET | `/api/auth/sessions` | `handleSessionsGet` |
| POST | `/api/bids` | `handleBidsPost` |
| PUT | `/api/bids` | `handleBidsPut` |
| DELETE | `/api/billing/*` | `handleBillingDelete` |
| GET | `/api/billing/*` | `handleBillingGet` |
| POST | `/api/billing/*` | `handleBillingPost` |
| PUT | `/api/billing/*` | `handleBillingPut` |
| GET | `/api/bridge/agents` | `handleBridgeAgentsGet` |
| GET | `/api/bridge/metadata` | `handleBridgeMetadataGet` |
| GET | `/api/bridge/offices` | `handleBridgeOfficesGet` |
| GET | `/api/bridge/openhouses` | `handleBridgeOpenhousesGet` |
| GET | `/api/bridge/search` | `handleBridgeSearchGet` |
| GET | `/api/bridge/sync` | `handleBridgeSyncGet` |
| POST | `/api/bridge/sync` | `handleBridgeSyncPost` |
| GET | `/api/calendar/auth` | `handleCalendarAuthGet` |
| GET | `/api/calendar/callback` | `handleCalendarCallbackGet` |
| GET | `/api/calendar/events` | `handleCalendarEventsGet` |
| POST | `/api/calendar/sync` | `handleCalendarSyncPost` |
| GET | `/api/changelog/metadata` | `handleChangelogMetadataGet` |
| POST | `/api/closing/title-search` | `handleClosingTitleSearchPost` |
| GET | `/api/config/attorney-states` | `handleAttorneyStatesGet` |
| POST | `/api/contact` | `handleContactPost` |
| GET | `/api/cron/bridge-sync` | `handleCronBridgeSyncGet` |
| GET | `/api/cron/consent-audit` | `handleCronConsentAuditGet` |
| GET | `/api/cron/daily-sync` | `handleCronDailySyncGet` |
| GET | `/api/cron/lender-package-reminders` | `handleCronLenderPackageRemindersGet` |
| GET | `/api/cron/lifecycle-alerts` | `handleCronLifecycleAlertsGet` |
| GET | `/api/cron/process-daily-kpis` | `handleCronProcessDailyKpisGet` |
| GET | `/api/cron/process-deletions` | `handleCronProcessDeletionsGet` |
| GET | `/api/cron/process-email-notifications` | `handleCronProcessEmailNotificationsGet` |
| GET | `/api/cron/process-team-invites` | `handleCronProcessTeamInvitesGet` |
| GET | `/api/cron/refresh-place-ids` | `handleCronRefreshPlaceIdsGet` |
| GET | `/api/cron/retry-failed-connections` | `handleCronRetryFailedConnectionsGet` |
| GET | `/api/cron/send-digest` | `handleCronSendDigestGet` |
| GET | `/api/cron/snapshots` | `handleCronSnapshotsGet` |
| GET | `/api/cron/sync-financial-transactions` | `handleCronSyncFinancialTransactionsGet` |
| GET | `/api/cron/sync-liabilities` | `handleCronSyncLiabilitiesGet` |
| GET | `/api/cron/sync-plaid-liabilities` | `handleCronSyncPlaidLiabilitiesGet` |
| GET | `/api/cron/sync-transactions` | `handleCronSyncTransactionsGet` |
| GET | `/api/dashboard` | `handleDashboardGet` |
| GET | `/api/data/*` | `handleDataGet` |
| POST | `/api/data/*` | `handleDataPost` |
| POST | `/api/deal-analyzer/property-lookup` | `handleDealAnalyzerPropertyLookupPost` |
| POST | `/api/deals/broadcast` | `handleDealsBroadcastPost` |
| POST | `/api/drive/provision` | `handleDriveProvisionPost` |
| GET | `/api/e2e/follows` | `handleE2eFollowsGet` |
| POST | `/api/e2e/follows` | `handleE2eFollowsPost` |
| POST | `/api/emails/send` | `handleEmailsSendPost` |
| GET | `/api/entitlements/project-count` | `handleEntitlementsProjectCountGet` |
| POST | `/api/esign/create` | `handleEsignCreatePost` |
| GET | `/api/esign/status/[envelopeId]` | `handleEsignStatusGet` |
| POST | `/api/events` | `handleEventsPost` |
| GET | `/api/events/stream` | `handleEventsStreamGet` |
| POST | `/api/exit/complete` | `handleExitCompletePost` |
| GET | `/api/financial/transactions` | `handleFinancialTransactionsGet` |
| POST | `/api/financial/transactions` | `handleFinancialTransactionsPost` |
| POST | `/api/financial-transactions/[id]/approve` | `handleFinancialTransactionApprovePost` |
| POST | `/api/financial-transactions/[id]/classify` | `handleFinancialTransactionClassifyPost` |
| POST | `/api/financial-transactions/bulk-classify` | `handleFinancialTransactionsBulkClassifyPost` |
| GET | `/api/financial-transactions/project/[projectId]` | `handleFinancialTransactionsByProjectGet` |
| GET | `/api/financial-transactions/project/[projectId]` | `handleFinancialTransactionsListGet` |
| POST | `/api/fund/close-deal` | `handleFundCloseDealPost` |
| POST | `/api/identity/appeal` | `handleIdentityAppealPost` |
| POST | `/api/identity/claim/bind-token` | `handleIdentityClaimBindTokenPost` |
| POST | `/api/identity/claim/start` | `handleIdentityClaimStartPost` |
| POST | `/api/identity/claim/verify` | `handleIdentityClaimVerifyPost` |
| POST | `/api/identity/report-spam` | `handleIdentityReportSpamPost` |
| POST | `/api/inbox` | `handleInboxPost` |
| DELETE | `/api/inbox/[id]` | `handleInboxByIdDelete` |
| PATCH | `/api/inbox/[id]` | `handleInboxByIdPatch` |
| POST | `/api/inbox/[id]/actions` | `handleInboxActionsPost` |
| POST | `/api/inbox/backfill` | `handleInboxBackfillPost` |
| GET | `/api/insights/market` | `handleInsightsMarketGet` |
| GET | `/api/insights/metrics` | `handleInsightsMetricsGet` |
| GET | `/api/insights/portfolio` | `handleInsightsPortfolioGet` |
| GET | `/api/insights/trends` | `handleInsightsTrendsGet` |
| GET | `/api/integrations/[provider]/authorize|callback` | `handleIntegrationsActionGet` |
| DELETE | `/api/integrations/[provider]/disconnect` | `handleIntegrationsActionDelete` |
| GET | `/api/integrations/google-drive/authorize` | `handleIntegrationsGoogleDriveAuthorizeGet` |
| GET | `/api/integrations/google-drive/callback` | `handleIntegrationsGoogleDriveCallbackGet` |
| POST | `/api/integrations/mls/connect` | `handleIntegrationsMlsConnectPost` |
| GET | `/api/integrations/status` | `handleIntegrationsStatusGet` |
| GET | `/api/invest/[token]` | `handleInvestTokenGet` |
| POST | `/api/invest/[token]` | `handleInvestTokenPost` |
| GET | `/api/investor/timeline` | `handleInvestorTimelineGet` |
| GET | `/api/invitations/[token]` | `handleInvitationsTokenGet` |
| POST | `/api/invitations/[token]/ask` | `handleInvitationsTokenAskPost` |
| DELETE | `/api/invitations/[token]/indication` | `handleInvitationsIndicationDelete` |
| POST | `/api/invitations/[token]/indication` | `handleInvitationsIndicationPost` |
| POST | `/api/invitations/[token]/subscribe` | `handleInvitationsSubscribePost` |
| POST | `/api/invitations/[token]/subscription` | `handleInvitationsSubscriptionPost` |
| GET | `/api/invitations/[token]/updates` | `handleInvitationsUpdatesGet` |
| GET | `/api/invitations/accept` | `handleInvitationsAcceptGet` |
| POST | `/api/invitations/broadcast` | `handleInvitationsBroadcastPost` |
| POST | `/api/invitations/respond` | `handleInvitationsRespondPost` |
| POST | `/api/invitations/send` | `handleInvitationsSendPost` |
| GET | `/api/invites` | `handleInvitesGet` |
| POST | `/api/invites` | `handleInvitesPost` |
| GET | `/api/lawyers` | `handleLawyersGet` |
| POST | `/api/loi/generate` | `handleLoiGeneratePost` |
| GET | `/api/map-tile` | `handleMapTileGet` |
| GET | `/api/market-vitals` | `handleMarketVitalsGet` |
| GET | `/api/mcp/[transport]` | `handleMcpTransportGet` |
| POST | `/api/mcp/[transport]` | `handleMcpTransportPost` |
| GET | `/api/messages` | `handleMessagesGet` |
| POST | `/api/messages` | `handleMessagesPost` |
| PATCH | `/api/messages/[id]/read` | `handleMessageReadPatch` |
| GET | `/api/messages/thread/[threadId]` | `handleMessagesThreadGet` |
| GET | `/api/mls/search` | `handleMlsSearchGet` |
| POST | `/api/notifications/deadline-alert` | `handleNotificationsDeadlineAlertPost` |
| POST | `/api/notifications/test` | `handleNotificationsTestPost` |
| POST | `/api/packages/share` | `handlePackagesSharePost` |
| GET | `/api/packages/share/[token]` | `handlePackagesShareTokenGet` |
| DELETE | `/api/packages/share` | `handlePackagesShareDelete` |
| GET | `/api/permits` | `handlePermitsGet` |
| POST | `/api/places/autocomplete` | `handlePlacesAutocompletePost` |
| POST | `/api/places/autocomplete-public` | `handlePlacesAutocompletePublicPost` |
| POST | `/api/places/details` | `handlePlacesDetailsPost` |
| GET | `/api/places/geocode` | `handlePlacesGeocodeGet` |
| POST | `/api/places/validate` | `handlePlacesValidatePost` |
| GET | `/api/plaid/connections` | `handlePlaidConnectionsGet` |
| DELETE | `/api/plaid/connections/[connectionId]` | `handlePlaidConnectionByIdDelete` |
| POST | `/api/plaid/connections/[connectionId]/disconnect` | `handlePlaidConnectionDisconnectPost` |
| DELETE | `/api/plaid/connections/[connectionId]/pause` | `handlePlaidConnectionPauseDelete` |
| POST | `/api/plaid/connections/[connectionId]/pause` | `handlePlaidConnectionPausePost` |
| POST | `/api/plaid/create-link-token` | `handlePlaidCreateLinkTokenPost` |
| POST | `/api/plaid/exchange-public-token` | `handlePlaidExchangePublicTokenPost` |
| POST | `/api/plaid/exchange-v2` | `handlePlaidExchangePost` |
| POST | `/api/plaid/exchange-v2` | `handlePlaidExchangeV2Post` |
| GET | `/api/plaid/liabilities` | `handlePlaidLiabilitiesGet` |
| POST | `/api/presence/heartbeat` | `handlePresenceHeartbeatPost` |
| PATCH | `/api/projects/[id]/acquisition` | `handleProjectsAcquisitionPatch` |
| GET | `/api/projects/[id]/capital-stack/export` | `handleProjectsCapitalStackExportGet` |
| GET | `/api/projects/[id]/commitments` | `handleProjectCommitmentsGet` |
| POST | `/api/projects/[id]/commitments` | `handleProjectCommitmentsPost` |
| DELETE | `/api/projects/[id]/commitments/[cId]` | `handleProjectCommitmentDelete` |
| PATCH | `/api/projects/[id]/commitments/[cId]` | `handleProjectCommitmentPatch` |
| GET | `/api/projects/[id]/dealUpdates` | `handleProjectDealUpdatesGet` |
| POST | `/api/projects/[id]/dealUpdates` | `handleProjectDealUpdatesPost` |
| GET | `/api/projects/[id]/documents` | `handleProjectsDocumentsGet` |
| POST | `/api/projects/[id]/documents` | `handleProjectsDocumentsPost` |
| GET | `/api/projects/[id]/documents/[docId]/download` | `handleProjectsDocumentDownloadGet` |
| PATCH | `/api/projects/[id]/exit` | `handleProjectsExitPatch` |
| PATCH | `/api/projects/[id]/hold` | `handleProjectsHoldPatch` |
| POST | `/api/projects/[id]/hold/auto-advance` | `handleProjectsHoldAutoAdvancePost` |
| GET | `/api/projects/[id]/hold/registry` | `handleProjectsHoldRegistryGet` |
| PATCH | `/api/projects/[id]/hold/registry` | `handleProjectsHoldRegistryPatch` |
| PATCH | `/api/projects/[id]/inquiries/[inquiryId]` | `handleProjectsInquiryPatch` |
| GET | `/api/projects/[id]/kpis/breakdown` | `handleProjectKpisBreakdownGet` |
| GET | `/api/projects/[id]/kpis/impact-preview` | `handleProjectKpisImpactPreviewGet` |
| POST | `/api/projects/[id]/kpis/recalculate` | `handleProjectKpisRecalculatePost` |
| GET | `/api/projects/[id]/lender-package` | `handleProjectsLenderPackageGet` |
| POST | `/api/projects/[id]/lender-package` | `handleProjectsLenderPackagePost` |
| DELETE | `/api/projects/[id]/lender-package/[itemId]` | `handleProjectsLenderPackageItemDelete` |
| PATCH | `/api/projects/[id]/lender-package/[itemId]` | `handleProjectsLenderPackageItemPatch` |
| POST | `/api/projects/[id]/lender-package/debt-folder` | `handleProjectsLenderPackageDebtFolderPost` |
| GET | `/api/projects/[id]/loan-estimates` | `handleProjectsLoanEstimatesGet` |
| POST | `/api/projects/[id]/loan-estimates` | `handleProjectsLoanEstimatesPost` |
| DELETE | `/api/projects/[id]/loan-estimates/[estimateId]` | `handleProjectsLoanEstimateDelete` |
| POST | `/api/projects/[id]/loan-estimates/[estimateId]/choose` | `handleProjectsLoanEstimateChoosePost` |
| GET | `/api/projects/[id]/loans` | `handleProjectsLoansGet` |
| POST | `/api/projects/[id]/loans` | `handleProjectsLoansPost` |
| POST | `/api/projects/[id]/proof-of-funds` | `handleProjectProofOfFundsPost` |
| PATCH | `/api/projects/[id]/purchase` | `handleProjectsPurchasePatch` |
| GET | `/api/projects/[id]/timeline` | `handleProjectTimelineGet` |
| GET | `/api/projects/[id]/transactions` | `handleProjectTransactionsGet` |
| PATCH | `/api/projects/[id]/visibility` | `handleProjectVisibilityPatch` |
| POST | `/api/projects/create` | `handleProjectsCreatePost` |
| POST | `/api/projects/rehab` | `handleProjectsRehabPost` |
| POST | `/api/projects/todos` | `handleProjectsTodosPost` |
| GET | `/api/reconciliations` | `handleReconciliationsGet` |
| POST | `/api/reconciliations` | `handleReconciliationsPost` |
| GET | `/api/reconciliations/[periodId]` | `handleReconciliationPeriodGet` |
| POST | `/api/reconciliations/[periodId]/finalize` | `handleReconciliationFinalizePost` |
| POST | `/api/reconciliations/[periodId]/match` | `handleReconciliationMatchPost` |
| GET | `/api/reconciliations/[periodId]/report` | `handleReconciliationReportGet` |
| POST | `/api/reconciliations/items/[itemId]/adjust` | `handleReconciliationItemAdjustPost` |
| POST | `/api/reconciliations/items/[itemId]/verify` | `handleReconciliationItemVerifyPost` |
| POST | `/api/reil/cron/refresh` | `handleReilCronRefreshPost` |
| GET | `/api/reil/listings` | `handleReilListingsGet` |
| GET | `/api/reil/market-stats` | `handleReilMarketStatsGet` |
| GET | `/api/reil/projects` | `handleReilProjectsGet` |
| POST | `/api/reil/projects` | `handleReilProjectsPost` |
| GET | `/api/reil/projects/[id]` | `handleReilProjectByIdGet` |
| PATCH | `/api/reil/projects/[id]` | `handleReilProjectByIdPatch` |
| GET | `/api/reil/projects/[id]/assignments` | `handleReilProjectAssignmentsGet` |
| POST | `/api/reil/projects/[id]/assignments` | `handleReilProjectAssignmentsPost` |
| PATCH | `/api/reil/projects/[id]/assignments/[aid]` | `handleReilProjectAssignmentPatch` |
| GET | `/api/reil/projects/[id]/closing-ledger/export` | `handleReilClosingLedgerExportGet` |
| POST | `/api/reil/projects/[id]/invite` | `handleReilProjectInvitePost` |
| POST | `/api/reil/projects/[id]/property` | `handleReilProjectPropertyPost` |
| GET | `/api/reil/projects/[id]/status` | `handleReilProjectStatusGet` |
| POST | `/api/reil/projects/[id]/status` | `handleReilProjectStatusPost` |
| GET | `/api/reil/projects/[id]/terms` | `handleReilProjectTermsGet` |
| POST | `/api/reil/projects/[id]/terms` | `handleReilProjectTermsPost` |
| GET | `/api/reil/projects/[id]/valuation` | `handleReilProjectValuationGet` |
| POST | `/api/reil/projects/[id]/valuation` | `handleReilProjectValuationPost` |
| POST | `/api/rent-history/import` | `handleRentHistoryImportPost` |
| POST | `/api/reporting/export` | `handleReportingExportPost` |
| POST | `/api/rules` | `handleRulesPost` |
| DELETE | `/api/rules/[id]` | `handleRulesDelete` |
| PUT | `/api/rules/[id]` | `handleRulesPut` |
| POST | `/api/rules/[id]/apply` | `handleRulesApplyPost` |
| GET | `/api/rules/project/[projectId]` | `handleRulesProjectGet` |
| GET | `/api/rules/project/[projectId]/suggestions` | `handleRulesProjectSuggestionsGet` |
| GET | `/api/security/settings` | `handleSecuritySettingsGet` |
| PUT | `/api/security/settings` | `handleSecuritySettingsPut` |
| DELETE | `/api/settings/*` | `handleSettingsDelete` |
| GET | `/api/settings/*` | `handleSettingsGet` |
| POST | `/api/settings/*` | `handleSettingsPost` |
| PUT | `/api/settings/*` | `handleSettingsPut` |
| GET | `/api/street-view` | `handleStreetViewGet` |
| POST | `/api/street-view` | `handleStreetViewPost` |
| POST | `/api/stripe/checkout` | `handleStripeCheckoutPost` |
| POST | `/api/stripe/invoices` | `handleStripeInvoicesPost` |
| POST | `/api/stripe/payment-method` | `handleStripePaymentMethodPost` |
| POST | `/api/stripe/portal` | `handleStripePortalPost` |
| GET | `/api/stripe/session-status` | `handleStripeSessionStatusGet` |
| POST | `/api/stripe/subscription` | `handleStripeSubscriptionPost` |
| POST | `/api/stripe/webhook` | `handleStripeWebhookPost` |
| POST | `/api/tasks/assign` | `handleTasksAssignPost` |
| POST | `/api/tax/1040-es` | `handleTax1040EsPost` |
| POST | `/api/tax/package` | `handleTaxPackagePost` |
| GET | `/api/tax/share` | `handleTaxShareGet` |
| POST | `/api/tax/share` | `handleTaxSharePost` |
| GET | `/api/tax/share/[token]` | `handleTaxShareTokenGet` |
| POST | `/api/tax/share/revoke` | `handleTaxShareRevokePost` |
| DELETE | `/api/team/*` | `handleTeamDelete` |
| GET | `/api/team/*` | `handleTeamGet` |
| POST | `/api/team/*` | `handleTeamPost` |
| PUT | `/api/team/*` | `handleTeamPut` |
| PATCH | `/api/transactions/[id]/attribution` | `handleTransactionAttributionPatch` |
| POST | `/api/transactions/[id]/attribution/search` | `handleTransactionAttributionSearchPost` |
| POST | `/api/transactions/[id]/identify` | `handleTransactionIdentifyPost` |
| GET | `/api/transactions/project/[projectId]/identification-suggestions` | `handleTransactionIdentificationSuggestionsGet` |
| POST | `/api/unsubscribe` | `handleUnsubscribePost` |
| POST | `/api/upload` | `handleUploadPost` |
| GET | `/api/user/notification-preferences` | `handleNotificationPreferencesGet` |
| PUT | `/api/user/notification-preferences` | `handleNotificationPreferencesPut` |
| POST | `/api/vendors/request` | `handleVendorsRequestPost` |
| POST | `/api/waitlist` | `handleWaitlistPost` |
| POST | `/api/webhooks/bridge` | `handleBridgeWebhookPost` |
| POST | `/api/webhooks/docusign` | `handleDocuSignWebhookPost` |
| GET | `/api/webhooks/email-reply` | `handleEmailReplyGet` |
| POST | `/api/webhooks/email-reply` | `handleEmailReplyPost` |
| POST | `/api/webhooks/emails` | `handleInboundEmailsWebhookPost` |
| POST | `/api/webhooks/inbound-email` | `handleInboundEmailParsePost` |
| POST | `/api/webhooks/plaid` | `handlePlaidWebhookPost` |
| GET | `/api/webhooks/sendgrid` | `handleSendGridWebhookGet` |
| POST | `/api/webhooks/sendgrid` | `handleSendGridWebhookPost` |
| POST | `/api/webhooks/sourcing` | `handleWebhooksSourcingPost` |
| GET | `/api/worker/drain` | `handleWorkerDrainGet` |
| POST | `/api/worker/drain` | `handleWorkerDrainPost` |
| GET | `/api/workspace` | `handleWorkspaceGet` |
| PUT | `/api/workspace` | `handleWorkspacePut` |
| POST | `/api/workspace/[action]` | `handleWorkspacePost` |
| POST | `/api/zoning-scan` | `handleZoningScanPost` |

## D. UI with no route

**None.** Every `fetch('/api/...')` in the web app has a matching adapter.

