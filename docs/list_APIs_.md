# API Surface — Migration Stack

**Last updated:** 2026-08-22
**Handler count:** 297 framework-agnostic handlers in `apps/api/` (`@paperworking/api`)
**Web adapters:** 27 Next.js route files in `apps/web/app/api/` (**31** method+path pairs wired now; remaining handlers ready for cutover)

Source of truth: exports in `apps/api/src/index.ts` + JSDoc `METHOD /api/...` on each handler.

**Connection audit:** see [API_CONNECTION_STATUS.md](./API_CONNECTION_STATUS.md) for which adapters have UI, which are ops-only, and the full unwired inventory (~269 handlers).

---

## 1. Web API adapters (wired in `apps/web`)

Live when running `npm run dev` (Next.js serves UI + these adapters).

| Method | Route | Handler(s) | UI |
|---|---|---|---|
| GET | `/api/health` | `handleHealthGet` | Ops only |
| POST, DELETE | `/api/auth/session` | `handleSessionPost`, `handleSessionDelete` | Login / logout |
| GET | `/api/auth/me` | Inline (session cookies) | AuthContext |
| GET | `/api/projects` | `handleProjectsListGet` | ProjectsListPanel |
| GET | `/api/projects/[id]` | `handleProjectGet` | Project workspace |
| GET | `/api/projects/[id]/kpis/current` | `handleProjectKpisCurrentGet` | Project insights/scorecard |
| GET | `/api/portfolio/metrics` | `handlePortfolioMetricsGet` | CommandCenterPanel |
| GET | `/api/insights` | `handleInsightsGet` | PortfolioInsightsPanel |
| GET | `/api/reports/portfolio` | `handleReportsPortfolioGet` | PortfolioReportsPanel |
| POST | `/api/reports/generate` | `handleReportsGeneratePost` | PortfolioReportsPanel |
| GET | `/api/reports/[period]` | `handleReportsPeriodGet` | ProjectReportsPanel |
| GET | `/api/marketplace/listings` | `handleMarketplaceListingsGet` | VendorMarketplacePanel |
| GET | `/api/marketplace/profile` | `handleMarketplaceProfileGet` | CommandCenterPanel |
| GET | `/api/marketplace/investors` | `handleMarketplaceInvestorsGet` | VendorMarketplacePanel |
| POST | `/api/marketplace/investors/follow` | `handleMarketplaceInvestorsFollowPost` | Marketplace panels |
| GET | `/api/marketplace/investors/[id]` | `handleMarketplaceInvestorByIdGet` | InvestorProfilePanel |
| GET | `/api/deals` | `handleDealsGet` | DealsMarketplacePanel |
| GET | `/api/deals/exists` | `handleDealsExistsGet` | DealDetailPanel |
| GET | `/api/vendors` | `handleVendorsGet` | VendorMarketplacePanel |
| GET, PUT | `/api/vendor-portal/requests` | `handleVendorPortalRequestsGet`, `handleVendorPortalRequestsPut` | VendorRequestsPanel |
| GET, PUT | `/api/vendor-portal/profile` | Inline (seed data) | VendorProfilePanel |
| GET | `/api/admin/lender-rates` | `handleAdminLenderRatesGet` | Admin panels |
| GET | `/api/admin/lender-checklists` | `handleAdminLenderChecklistsGet` | Admin panels |
| GET | `/api/admin/rentcast-usage` | `handleAdminRentcastUsageGet` | AdminOverviewPanel |
| GET | `/api/admin/agent-crew` | `handleAdminAgentCrewGet` | AdminAgentCrewPanel |
| GET, DELETE | `/api/admin/agent-crew/[id]` | `handleAdminAgentCrewByIdGet`, `handleAdminAgentCrewByIdDelete` | AdminAgentCrewPanel |
| POST | `/api/admin/agent-crew/[id]/impersonate` | `handleAdminAgentCrewImpersonatePost` | AdminAgentCrewPanel |

---

## 2. Full handler registry (297 handlers)

### Summary by domain

| Domain | Count |
|---|---|
| `account` | 3 |
| `admin` | 8 |
| `auth` | 9 |
| `bids` | 2 |
| `billing` | 4 |
| `bridge` | 7 |
| `calendar` | 4 |
| `changelog` | 1 |
| `closing` | 1 |
| `config` | 1 |
| `contact` | 1 |
| `cron` | 17 |
| `dashboard` | 1 |
| `data` | 2 |
| `deal-analyzer` | 1 |
| `deals` | 3 |
| `drive` | 1 |
| `e2e` | 2 |
| `emails` | 1 |
| `entitlements` | 1 |
| `esign` | 2 |
| `events` | 2 |
| `exit` | 1 |
| `financial` | 2 |
| `financial-transactions` | 5 |
| `fund` | 1 |
| `health` | 1 |
| `identity` | 5 |
| `inbox` | 5 |
| `insights` | 5 |
| `integrations` | 6 |
| `invest` | 2 |
| `investor` | 1 |
| `invitations` | 11 |
| `invites` | 2 |
| `lawyers` | 1 |
| `loi` | 1 |
| `map-tile` | 1 |
| `market-vitals` | 1 |
| `marketplace` | 5 |
| `mcp` | 2 |
| `messages` | 4 |
| `mls` | 1 |
| `notifications` | 2 |
| `packages` | 3 |
| `permits` | 1 |
| `places` | 6 |
| `plaid` | 10 |
| `portfolio` | 1 |
| `presence` | 1 |
| `projects` | 43 |
| `reconciliations` | 8 |
| `reil` | 19 |
| `rent-history` | 1 |
| `reporting` | 1 |
| `reports` | 3 |
| `rules` | 6 |
| `security` | 2 |
| `settings` | 4 |
| `street-view` | 2 |
| `stripe` | 7 |
| `tasks` | 1 |
| `tax` | 6 |
| `team` | 4 |
| `transactions` | 4 |
| `unsubscribe` | 1 |
| `upload` | 1 |
| `user` | 2 |
| `vendor-portal` | 2 |
| `vendors` | 2 |
| `waitlist` | 1 |
| `webhooks` | 10 |
| `worker` | 2 |
| `workspace` | 3 |
| `zoning-scan` | 1 |
| **Total** | **297** |

### `account` (3)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/account/data/delete` | `handleAccountDataDeleteGet` |
| POST | `/api/account/data/delete` | `handleAccountDataDeletePost` |
| POST | `/api/account/data/download` | `handleAccountDataDownloadPost` |

### `admin` (8)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/admin/agent-crew` | `handleAdminAgentCrewGet` |
| DELETE | `/api/admin/agent-crew/[id]` | `handleAdminAgentCrewByIdDelete` |
| GET | `/api/admin/agent-crew/[id]` | `handleAdminAgentCrewByIdGet` |
| POST | `/api/admin/agent-crew/[id]/impersonate` | `handleAdminAgentCrewImpersonatePost` |
| DELETE | `/api/admin/agent-crew/purge-all` | `handleAdminAgentCrewPurgeAllDelete` |
| GET | `/api/admin/lender-checklists` | `handleAdminLenderChecklistsGet` |
| GET | `/api/admin/lender-rates` | `handleAdminLenderRatesGet` |
| GET | `/api/admin/rentcast-usage` | `handleAdminRentcastUsageGet` |

### `auth` (9)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/auth/2fa/[action]` | `handleAuthTwoFaPost` |
| POST | `/api/auth/change-password` | `handleAuthChangePasswordPost` |
| GET | `/api/auth/ip` | `handleAuthIpGet` |
| POST | `/api/auth/magic-link` | `handleAuthMagicLinkPost` |
| POST | `/api/auth/reset-password` | `handleAuthResetPasswordPost` |
| POST | `/api/auth/revoke` | `handleAuthRevokePost` |
| DELETE | `/api/auth/session` | `handleSessionDelete` |
| POST | `/api/auth/session` | `handleSessionPost` |
| GET | `/api/auth/sessions` | `handleSessionsGet` |

### `bids` (2)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/bids` | `handleBidsPost` |
| PUT | `/api/bids` | `handleBidsPut` |

### `billing` (4)

| Method | Route | Handler |
|---|---|---|
| DELETE | `/api/billing/*` | `handleBillingDelete` |
| GET | `/api/billing/*` | `handleBillingGet` |
| POST | `/api/billing/*` | `handleBillingPost` |
| PUT | `/api/billing/*` | `handleBillingPut` |

### `bridge` (7)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/bridge/agents` | `handleBridgeAgentsGet` |
| GET | `/api/bridge/metadata` | `handleBridgeMetadataGet` |
| GET | `/api/bridge/offices` | `handleBridgeOfficesGet` |
| GET | `/api/bridge/openhouses` | `handleBridgeOpenhousesGet` |
| GET | `/api/bridge/search` | `handleBridgeSearchGet` |
| GET | `/api/bridge/sync` | `handleBridgeSyncGet` |
| POST | `/api/bridge/sync` | `handleBridgeSyncPost` |

### `calendar` (4)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/calendar/auth` | `handleCalendarAuthGet` |
| GET | `/api/calendar/callback` | `handleCalendarCallbackGet` |
| GET | `/api/calendar/events` | `handleCalendarEventsGet` |
| POST | `/api/calendar/sync` | `handleCalendarSyncPost` |

### `changelog` (1)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/changelog/metadata` | `handleChangelogMetadataGet` |

### `closing` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/closing/title-search` | `handleClosingTitleSearchPost` |

### `config` (1)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/config/attorney-states` | `handleAttorneyStatesGet` |

### `contact` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/contact` | `handleContactPost` |

### `cron` (17)

| Method | Route | Handler |
|---|---|---|
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

### `dashboard` (1)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/dashboard` | `handleDashboardGet` |

### `data` (2)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/data/*` | `handleDataGet` |
| POST | `/api/data/*` | `handleDataPost` |

### `deal-analyzer` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/deal-analyzer/property-lookup` | `handleDealAnalyzerPropertyLookupPost` |

### `deals` (3)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/deals` | `handleDealsGet` |
| POST | `/api/deals/broadcast` | `handleDealsBroadcastPost` |
| GET | `/api/deals/exists` | `handleDealsExistsGet` |

### `drive` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/drive/provision` | `handleDriveProvisionPost` |

### `e2e` (2)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/e2e/follows` | `handleE2eFollowsGet` |
| POST | `/api/e2e/follows` | `handleE2eFollowsPost` |

### `emails` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/emails/send` | `handleEmailsSendPost` |

### `entitlements` (1)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/entitlements/project-count` | `handleEntitlementsProjectCountGet` |

### `esign` (2)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/esign/create` | `handleEsignCreatePost` |
| GET | `/api/esign/status/[envelopeId]` | `handleEsignStatusGet` |

### `events` (2)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/events` | `handleEventsPost` |
| GET | `/api/events/stream` | `handleEventsStreamGet` |

### `exit` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/exit/complete` | `handleExitCompletePost` |

### `financial` (2)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/financial/transactions` | `handleFinancialTransactionsGet` |
| POST | `/api/financial/transactions` | `handleFinancialTransactionsPost` |

### `financial-transactions` (5)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/financial-transactions/[id]/approve` | `handleFinancialTransactionApprovePost` |
| POST | `/api/financial-transactions/[id]/classify` | `handleFinancialTransactionClassifyPost` |
| POST | `/api/financial-transactions/bulk-classify` | `handleFinancialTransactionsBulkClassifyPost` |
| GET | `/api/financial-transactions/project/[projectId]` | `handleFinancialTransactionsByProjectGet` |
| GET | `/api/financial-transactions/project/[projectId]` | `handleFinancialTransactionsListGet` |

### `fund` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/fund/close-deal` | `handleFundCloseDealPost` |

### `health` (1)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/health` | `handleHealthGet` |

### `identity` (5)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/identity/appeal` | `handleIdentityAppealPost` |
| POST | `/api/identity/claim/bind-token` | `handleIdentityClaimBindTokenPost` |
| POST | `/api/identity/claim/start` | `handleIdentityClaimStartPost` |
| POST | `/api/identity/claim/verify` | `handleIdentityClaimVerifyPost` |
| POST | `/api/identity/report-spam` | `handleIdentityReportSpamPost` |

### `inbox` (5)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/inbox` | `handleInboxPost` |
| DELETE | `/api/inbox/[id]` | `handleInboxByIdDelete` |
| PATCH | `/api/inbox/[id]` | `handleInboxByIdPatch` |
| POST | `/api/inbox/[id]/actions` | `handleInboxActionsPost` |
| POST | `/api/inbox/backfill` | `handleInboxBackfillPost` |

### `insights` (5)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/insights` | `handleInsightsGet` |
| GET | `/api/insights/market` | `handleInsightsMarketGet` |
| GET | `/api/insights/metrics` | `handleInsightsMetricsGet` |
| GET | `/api/insights/portfolio` | `handleInsightsPortfolioGet` |
| GET | `/api/insights/trends` | `handleInsightsTrendsGet` |

### `integrations` (6)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/integrations/[provider]/authorize|callback` | `handleIntegrationsActionGet` |
| DELETE | `/api/integrations/[provider]/disconnect` | `handleIntegrationsActionDelete` |
| GET | `/api/integrations/google-drive/authorize` | `handleIntegrationsGoogleDriveAuthorizeGet` |
| GET | `/api/integrations/google-drive/callback` | `handleIntegrationsGoogleDriveCallbackGet` |
| POST | `/api/integrations/mls/connect` | `handleIntegrationsMlsConnectPost` |
| GET | `/api/integrations/status` | `handleIntegrationsStatusGet` |

### `invest` (2)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/invest/[token]` | `handleInvestTokenGet` |
| POST | `/api/invest/[token]` | `handleInvestTokenPost` |

### `investor` (1)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/investor/timeline` | `handleInvestorTimelineGet` |

### `invitations` (11)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/invitations/[token]` | `handleInvitationsTokenGet` |
| POST | `/api/invitations/[token]/ask` | `handleInvitationsTokenAskPost` |
| DELETE | `/api/invitations/[token]/indication` | `handleInvitationsIndicationDelete` |
| POST | `/api/invitations/[token]/indication` | `handleInvitationsIndicationPost` |
| POST | `/api/invitations/[token]/subscribe` | `handleInvitationsSubscribePost` |
| POST | `/api/invitations/[token]/subscription` | `handleInvitationsSubscriptionPost` |
| GET | `/api/invitations/[token]/updates` | `handleInvitationsUpdatesGet` |
| GET | `/api/invitations/accept?token=` | `handleInvitationsAcceptGet` |
| POST | `/api/invitations/broadcast` | `handleInvitationsBroadcastPost` |
| POST | `/api/invitations/respond` | `handleInvitationsRespondPost` |
| POST | `/api/invitations/send` | `handleInvitationsSendPost` |

### `invites` (2)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/invites` | `handleInvitesGet` |
| POST | `/api/invites` | `handleInvitesPost` |

### `lawyers` (1)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/lawyers` | `handleLawyersGet` |

### `loi` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/loi/generate` | `handleLoiGeneratePost` |

### `map-tile` (1)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/map-tile` | `handleMapTileGet` |

### `market-vitals` (1)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/market-vitals` | `handleMarketVitalsGet` |

### `marketplace` (5)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/marketplace/investors` | `handleMarketplaceInvestorsGet` |
| GET | `/api/marketplace/investors/[id]` | `handleMarketplaceInvestorByIdGet` |
| POST | `/api/marketplace/investors/follow` | `handleMarketplaceInvestorsFollowPost` |
| GET | `/api/marketplace/listings` | `handleMarketplaceListingsGet` |
| GET | `/api/marketplace/profile` | `handleMarketplaceProfileGet` |

### `mcp` (2)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/mcp/[transport]` | `handleMcpTransportGet` |
| POST | `/api/mcp/[transport]` | `handleMcpTransportPost` |

### `messages` (4)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/messages` | `handleMessagesGet` |
| POST | `/api/messages` | `handleMessagesPost` |
| PATCH | `/api/messages/[id]/read` | `handleMessageReadPatch` |
| GET | `/api/messages/thread/[threadId]` | `handleMessagesThreadGet` |

### `mls` (1)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/mls/search?q=` | `handleMlsSearchGet` |

### `notifications` (2)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/notifications/deadline-alert` | `handleNotificationsDeadlineAlertPost` |
| POST | `/api/notifications/test` | `handleNotificationsTestPost` |

### `packages` (3)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/packages/share` | `handlePackagesSharePost` |
| GET | `/api/packages/share/[token]` | `handlePackagesShareTokenGet` |
| DELETE | `/api/packages/share?token=` | `handlePackagesShareDelete` |

### `permits` (1)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/permits` | `handlePermitsGet` |

### `places` (6)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/places/autocomplete` | `handlePlacesAutocompletePost` |
| OPTIONS | `/api/places/autocomplete-public` | `handlePlacesAutocompletePublicOptions` |
| POST | `/api/places/autocomplete-public` | `handlePlacesAutocompletePublicPost` |
| POST | `/api/places/details` | `handlePlacesDetailsPost` |
| GET | `/api/places/geocode?address=` | `handlePlacesGeocodeGet` |
| POST | `/api/places/validate` | `handlePlacesValidatePost` |

### `plaid` (10)

| Method | Route | Handler |
|---|---|---|
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

### `portfolio` (1)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/portfolio/metrics` | `handlePortfolioMetricsGet` |

### `presence` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/presence/heartbeat` | `handlePresenceHeartbeatPost` |

### `projects` (43)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/projects` | `handleProjectsListGet` |
| GET | `/api/projects/[id]` | `handleProjectGet` |
| PATCH | `/api/projects/[id]` | `handleProjectPatch` |
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
| GET | `/api/projects/[id]/kpis/current` | `handleProjectKpisCurrentGet` |
| GET | `/api/projects/[id]/kpis/impact-preview?transactionId=xxx` | `handleProjectKpisImpactPreviewGet` |
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

### `reconciliations` (8)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/reconciliations` | `handleReconciliationsGet` |
| POST | `/api/reconciliations` | `handleReconciliationsPost` |
| GET | `/api/reconciliations/[periodId]` | `handleReconciliationPeriodGet` |
| POST | `/api/reconciliations/[periodId]/finalize` | `handleReconciliationFinalizePost` |
| POST | `/api/reconciliations/[periodId]/match` | `handleReconciliationMatchPost` |
| GET | `/api/reconciliations/[periodId]/report?format=json|html|pdf` | `handleReconciliationReportGet` |
| POST | `/api/reconciliations/items/[itemId]/adjust` | `handleReconciliationItemAdjustPost` |
| POST | `/api/reconciliations/items/[itemId]/verify` | `handleReconciliationItemVerifyPost` |

### `reil` (19)

| Method | Route | Handler |
|---|---|---|
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

### `rent-history` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/rent-history/import` | `handleRentHistoryImportPost` |

### `reporting` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/reporting/export` | `handleReportingExportPost` |

### `reports` (3)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/reports/[period]` | `handleReportsPeriodGet` |
| POST | `/api/reports/generate` | `handleReportsGeneratePost` |
| GET | `/api/reports/portfolio` | `handleReportsPortfolioGet` |

### `rules` (6)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/rules` | `handleRulesPost` |
| DELETE | `/api/rules/[id]` | `handleRulesDelete` |
| PUT | `/api/rules/[id]` | `handleRulesPut` |
| POST | `/api/rules/[id]/apply` | `handleRulesApplyPost` |
| GET | `/api/rules/project/[projectId]` | `handleRulesProjectGet` |
| GET | `/api/rules/project/[projectId]/suggestions` | `handleRulesProjectSuggestionsGet` |

### `security` (2)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/security/settings` | `handleSecuritySettingsGet` |
| PUT | `/api/security/settings` | `handleSecuritySettingsPut` |

### `settings` (4)

| Method | Route | Handler |
|---|---|---|
| DELETE | `/api/settings/*` | `handleSettingsDelete` |
| GET | `/api/settings/*` | `handleSettingsGet` |
| POST | `/api/settings/*` | `handleSettingsPost` |
| PUT | `/api/settings/*` | `handleSettingsPut` |

### `street-view` (2)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/street-view` | `handleStreetViewGet` |
| POST | `/api/street-view` | `handleStreetViewPost` |

### `stripe` (7)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/stripe/checkout` | `handleStripeCheckoutPost` |
| POST | `/api/stripe/invoices` | `handleStripeInvoicesPost` |
| POST | `/api/stripe/payment-method` | `handleStripePaymentMethodPost` |
| POST | `/api/stripe/portal` | `handleStripePortalPost` |
| GET | `/api/stripe/session-status` | `handleStripeSessionStatusGet` |
| POST | `/api/stripe/subscription` | `handleStripeSubscriptionPost` |
| POST | `/api/stripe/webhook` | `handleStripeWebhookPost` |

### `tasks` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/tasks/assign` | `handleTasksAssignPost` |

### `tax` (6)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/tax/1040-es` | `handleTax1040EsPost` |
| POST | `/api/tax/package` | `handleTaxPackagePost` |
| GET | `/api/tax/share` | `handleTaxShareGet` |
| POST | `/api/tax/share` | `handleTaxSharePost` |
| GET | `/api/tax/share/[token]` | `handleTaxShareTokenGet` |
| POST | `/api/tax/share/revoke` | `handleTaxShareRevokePost` |

### `team` (4)

| Method | Route | Handler |
|---|---|---|
| DELETE | `/api/team/*` | `handleTeamDelete` |
| GET | `/api/team/*` | `handleTeamGet` |
| POST | `/api/team/*` | `handleTeamPost` |
| PUT | `/api/team/*` | `handleTeamPut` |

### `transactions` (4)

| Method | Route | Handler |
|---|---|---|
| PATCH | `/api/transactions/[id]/attribution` | `handleTransactionAttributionPatch` |
| POST | `/api/transactions/[id]/attribution/search` | `handleTransactionAttributionSearchPost` |
| POST | `/api/transactions/[id]/identify` | `handleTransactionIdentifyPost` |
| GET | `/api/transactions/project/[projectId]/identification-suggestions` | `handleTransactionIdentificationSuggestionsGet` |

### `unsubscribe` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/unsubscribe` | `handleUnsubscribePost` |

### `upload` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/upload` | `handleUploadPost` |

### `user` (2)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/user/notification-preferences` | `handleNotificationPreferencesGet` |
| PUT | `/api/user/notification-preferences` | `handleNotificationPreferencesPut` |

### `vendor-portal` (2)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/vendor-portal/requests` | `handleVendorPortalRequestsGet` |
| PUT | `/api/vendor-portal/requests` | `handleVendorPortalRequestsPut` |

### `vendors` (2)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/vendors` | `handleVendorsGet` |
| POST | `/api/vendors/request` | `handleVendorsRequestPost` |

### `waitlist` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/waitlist` | `handleWaitlistPost` |

### `webhooks` (10)

| Method | Route | Handler |
|---|---|---|
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

### `worker` (2)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/worker/drain` | `handleWorkerDrainGet` |
| POST | `/api/worker/drain` | `handleWorkerDrainPost` |

### `workspace` (3)

| Method | Route | Handler |
|---|---|---|
| GET | `/api/workspace` | `handleWorkspaceGet` |
| PUT | `/api/workspace` | `handleWorkspacePut` |
| POST | `/api/workspace/[action]` | `handleWorkspacePost` |

### `zoning-scan` (1)

| Method | Route | Handler |
|---|---|---|
| POST | `/api/zoning-scan` | `handleZoningScanPost` |

---

## 3. Alphabetical handler index

| Handler | Method | Route |
|---|---|---|
| `handleAccountDataDeleteGet` | GET | `/api/account/data/delete` |
| `handleAccountDataDeletePost` | POST | `/api/account/data/delete` |
| `handleAccountDataDownloadPost` | POST | `/api/account/data/download` |
| `handleAdminAgentCrewByIdDelete` | DELETE | `/api/admin/agent-crew/[id]` |
| `handleAdminAgentCrewByIdGet` | GET | `/api/admin/agent-crew/[id]` |
| `handleAdminAgentCrewGet` | GET | `/api/admin/agent-crew` |
| `handleAdminAgentCrewImpersonatePost` | POST | `/api/admin/agent-crew/[id]/impersonate` |
| `handleAdminAgentCrewPurgeAllDelete` | DELETE | `/api/admin/agent-crew/purge-all` |
| `handleAdminLenderChecklistsGet` | GET | `/api/admin/lender-checklists` |
| `handleAdminLenderRatesGet` | GET | `/api/admin/lender-rates` |
| `handleAdminRentcastUsageGet` | GET | `/api/admin/rentcast-usage` |
| `handleAttorneyStatesGet` | GET | `/api/config/attorney-states` |
| `handleAuthChangePasswordPost` | POST | `/api/auth/change-password` |
| `handleAuthIpGet` | GET | `/api/auth/ip` |
| `handleAuthMagicLinkPost` | POST | `/api/auth/magic-link` |
| `handleAuthResetPasswordPost` | POST | `/api/auth/reset-password` |
| `handleAuthRevokePost` | POST | `/api/auth/revoke` |
| `handleAuthTwoFaPost` | POST | `/api/auth/2fa/[action]` |
| `handleBidsPost` | POST | `/api/bids` |
| `handleBidsPut` | PUT | `/api/bids` |
| `handleBillingDelete` | DELETE | `/api/billing/*` |
| `handleBillingGet` | GET | `/api/billing/*` |
| `handleBillingPost` | POST | `/api/billing/*` |
| `handleBillingPut` | PUT | `/api/billing/*` |
| `handleBridgeAgentsGet` | GET | `/api/bridge/agents` |
| `handleBridgeMetadataGet` | GET | `/api/bridge/metadata` |
| `handleBridgeOfficesGet` | GET | `/api/bridge/offices` |
| `handleBridgeOpenhousesGet` | GET | `/api/bridge/openhouses` |
| `handleBridgeSearchGet` | GET | `/api/bridge/search` |
| `handleBridgeSyncGet` | GET | `/api/bridge/sync` |
| `handleBridgeSyncPost` | POST | `/api/bridge/sync` |
| `handleBridgeWebhookPost` | POST | `/api/webhooks/bridge` |
| `handleCalendarAuthGet` | GET | `/api/calendar/auth` |
| `handleCalendarCallbackGet` | GET | `/api/calendar/callback` |
| `handleCalendarEventsGet` | GET | `/api/calendar/events` |
| `handleCalendarSyncPost` | POST | `/api/calendar/sync` |
| `handleChangelogMetadataGet` | GET | `/api/changelog/metadata` |
| `handleClosingTitleSearchPost` | POST | `/api/closing/title-search` |
| `handleContactPost` | POST | `/api/contact` |
| `handleCronBridgeSyncGet` | GET | `/api/cron/bridge-sync` |
| `handleCronConsentAuditGet` | GET | `/api/cron/consent-audit` |
| `handleCronDailySyncGet` | GET | `/api/cron/daily-sync` |
| `handleCronLenderPackageRemindersGet` | GET | `/api/cron/lender-package-reminders` |
| `handleCronLifecycleAlertsGet` | GET | `/api/cron/lifecycle-alerts` |
| `handleCronProcessDailyKpisGet` | GET | `/api/cron/process-daily-kpis` |
| `handleCronProcessDeletionsGet` | GET | `/api/cron/process-deletions` |
| `handleCronProcessEmailNotificationsGet` | GET | `/api/cron/process-email-notifications` |
| `handleCronProcessTeamInvitesGet` | GET | `/api/cron/process-team-invites` |
| `handleCronRefreshPlaceIdsGet` | GET | `/api/cron/refresh-place-ids` |
| `handleCronRetryFailedConnectionsGet` | GET | `/api/cron/retry-failed-connections` |
| `handleCronSendDigestGet` | GET | `/api/cron/send-digest` |
| `handleCronSnapshotsGet` | GET | `/api/cron/snapshots` |
| `handleCronSyncFinancialTransactionsGet` | GET | `/api/cron/sync-financial-transactions` |
| `handleCronSyncLiabilitiesGet` | GET | `/api/cron/sync-liabilities` |
| `handleCronSyncPlaidLiabilitiesGet` | GET | `/api/cron/sync-plaid-liabilities` |
| `handleCronSyncTransactionsGet` | GET | `/api/cron/sync-transactions` |
| `handleDashboardGet` | GET | `/api/dashboard` |
| `handleDataGet` | GET | `/api/data/*` |
| `handleDataPost` | POST | `/api/data/*` |
| `handleDealAnalyzerPropertyLookupPost` | POST | `/api/deal-analyzer/property-lookup` |
| `handleDealsBroadcastPost` | POST | `/api/deals/broadcast` |
| `handleDealsExistsGet` | GET | `/api/deals/exists` |
| `handleDealsGet` | GET | `/api/deals` |
| `handleDocuSignWebhookPost` | POST | `/api/webhooks/docusign` |
| `handleDriveProvisionPost` | POST | `/api/drive/provision` |
| `handleE2eFollowsGet` | GET | `/api/e2e/follows` |
| `handleE2eFollowsPost` | POST | `/api/e2e/follows` |
| `handleEmailReplyGet` | GET | `/api/webhooks/email-reply` |
| `handleEmailReplyPost` | POST | `/api/webhooks/email-reply` |
| `handleEmailsSendPost` | POST | `/api/emails/send` |
| `handleEntitlementsProjectCountGet` | GET | `/api/entitlements/project-count` |
| `handleEsignCreatePost` | POST | `/api/esign/create` |
| `handleEsignStatusGet` | GET | `/api/esign/status/[envelopeId]` |
| `handleEventsPost` | POST | `/api/events` |
| `handleEventsStreamGet` | GET | `/api/events/stream` |
| `handleExitCompletePost` | POST | `/api/exit/complete` |
| `handleFinancialTransactionApprovePost` | POST | `/api/financial-transactions/[id]/approve` |
| `handleFinancialTransactionClassifyPost` | POST | `/api/financial-transactions/[id]/classify` |
| `handleFinancialTransactionsBulkClassifyPost` | POST | `/api/financial-transactions/bulk-classify` |
| `handleFinancialTransactionsByProjectGet` | GET | `/api/financial-transactions/project/[projectId]` |
| `handleFinancialTransactionsGet` | GET | `/api/financial/transactions` |
| `handleFinancialTransactionsListGet` | GET | `/api/financial-transactions/project/[projectId]` |
| `handleFinancialTransactionsPost` | POST | `/api/financial/transactions` |
| `handleFundCloseDealPost` | POST | `/api/fund/close-deal` |
| `handleHealthGet` | GET | `/api/health` |
| `handleIdentityAppealPost` | POST | `/api/identity/appeal` |
| `handleIdentityClaimBindTokenPost` | POST | `/api/identity/claim/bind-token` |
| `handleIdentityClaimStartPost` | POST | `/api/identity/claim/start` |
| `handleIdentityClaimVerifyPost` | POST | `/api/identity/claim/verify` |
| `handleIdentityReportSpamPost` | POST | `/api/identity/report-spam` |
| `handleInboundEmailParsePost` | POST | `/api/webhooks/inbound-email` |
| `handleInboundEmailsWebhookPost` | POST | `/api/webhooks/emails` |
| `handleInboxActionsPost` | POST | `/api/inbox/[id]/actions` |
| `handleInboxBackfillPost` | POST | `/api/inbox/backfill` |
| `handleInboxByIdDelete` | DELETE | `/api/inbox/[id]` |
| `handleInboxByIdPatch` | PATCH | `/api/inbox/[id]` |
| `handleInboxPost` | POST | `/api/inbox` |
| `handleInsightsGet` | GET | `/api/insights` |
| `handleInsightsMarketGet` | GET | `/api/insights/market` |
| `handleInsightsMetricsGet` | GET | `/api/insights/metrics` |
| `handleInsightsPortfolioGet` | GET | `/api/insights/portfolio` |
| `handleInsightsTrendsGet` | GET | `/api/insights/trends` |
| `handleIntegrationsActionDelete` | DELETE | `/api/integrations/[provider]/disconnect` |
| `handleIntegrationsActionGet` | GET | `/api/integrations/[provider]/authorize|callback` |
| `handleIntegrationsGoogleDriveAuthorizeGet` | GET | `/api/integrations/google-drive/authorize` |
| `handleIntegrationsGoogleDriveCallbackGet` | GET | `/api/integrations/google-drive/callback` |
| `handleIntegrationsMlsConnectPost` | POST | `/api/integrations/mls/connect` |
| `handleIntegrationsStatusGet` | GET | `/api/integrations/status` |
| `handleInvestorTimelineGet` | GET | `/api/investor/timeline` |
| `handleInvestTokenGet` | GET | `/api/invest/[token]` |
| `handleInvestTokenPost` | POST | `/api/invest/[token]` |
| `handleInvitationsAcceptGet` | GET | `/api/invitations/accept?token=` |
| `handleInvitationsBroadcastPost` | POST | `/api/invitations/broadcast` |
| `handleInvitationsIndicationDelete` | DELETE | `/api/invitations/[token]/indication` |
| `handleInvitationsIndicationPost` | POST | `/api/invitations/[token]/indication` |
| `handleInvitationsRespondPost` | POST | `/api/invitations/respond` |
| `handleInvitationsSendPost` | POST | `/api/invitations/send` |
| `handleInvitationsSubscribePost` | POST | `/api/invitations/[token]/subscribe` |
| `handleInvitationsSubscriptionPost` | POST | `/api/invitations/[token]/subscription` |
| `handleInvitationsTokenAskPost` | POST | `/api/invitations/[token]/ask` |
| `handleInvitationsTokenGet` | GET | `/api/invitations/[token]` |
| `handleInvitationsUpdatesGet` | GET | `/api/invitations/[token]/updates` |
| `handleInvitesGet` | GET | `/api/invites` |
| `handleInvitesPost` | POST | `/api/invites` |
| `handleLawyersGet` | GET | `/api/lawyers` |
| `handleLoiGeneratePost` | POST | `/api/loi/generate` |
| `handleMapTileGet` | GET | `/api/map-tile` |
| `handleMarketplaceInvestorByIdGet` | GET | `/api/marketplace/investors/[id]` |
| `handleMarketplaceInvestorsFollowPost` | POST | `/api/marketplace/investors/follow` |
| `handleMarketplaceInvestorsGet` | GET | `/api/marketplace/investors` |
| `handleMarketplaceListingsGet` | GET | `/api/marketplace/listings` |
| `handleMarketplaceProfileGet` | GET | `/api/marketplace/profile` |
| `handleMarketVitalsGet` | GET | `/api/market-vitals` |
| `handleMcpTransportGet` | GET | `/api/mcp/[transport]` |
| `handleMcpTransportPost` | POST | `/api/mcp/[transport]` |
| `handleMessageReadPatch` | PATCH | `/api/messages/[id]/read` |
| `handleMessagesGet` | GET | `/api/messages` |
| `handleMessagesPost` | POST | `/api/messages` |
| `handleMessagesThreadGet` | GET | `/api/messages/thread/[threadId]` |
| `handleMlsSearchGet` | GET | `/api/mls/search?q=` |
| `handleNotificationPreferencesGet` | GET | `/api/user/notification-preferences` |
| `handleNotificationPreferencesPut` | PUT | `/api/user/notification-preferences` |
| `handleNotificationsDeadlineAlertPost` | POST | `/api/notifications/deadline-alert` |
| `handleNotificationsTestPost` | POST | `/api/notifications/test` |
| `handlePackagesShareDelete` | DELETE | `/api/packages/share?token=` |
| `handlePackagesSharePost` | POST | `/api/packages/share` |
| `handlePackagesShareTokenGet` | GET | `/api/packages/share/[token]` |
| `handlePermitsGet` | GET | `/api/permits` |
| `handlePlacesAutocompletePost` | POST | `/api/places/autocomplete` |
| `handlePlacesAutocompletePublicOptions` | OPTIONS | `/api/places/autocomplete-public` |
| `handlePlacesAutocompletePublicPost` | POST | `/api/places/autocomplete-public` |
| `handlePlacesDetailsPost` | POST | `/api/places/details` |
| `handlePlacesGeocodeGet` | GET | `/api/places/geocode?address=` |
| `handlePlacesValidatePost` | POST | `/api/places/validate` |
| `handlePlaidConnectionByIdDelete` | DELETE | `/api/plaid/connections/[connectionId]` |
| `handlePlaidConnectionDisconnectPost` | POST | `/api/plaid/connections/[connectionId]/disconnect` |
| `handlePlaidConnectionPauseDelete` | DELETE | `/api/plaid/connections/[connectionId]/pause` |
| `handlePlaidConnectionPausePost` | POST | `/api/plaid/connections/[connectionId]/pause` |
| `handlePlaidConnectionsGet` | GET | `/api/plaid/connections` |
| `handlePlaidCreateLinkTokenPost` | POST | `/api/plaid/create-link-token` |
| `handlePlaidExchangePost` | POST | `/api/plaid/exchange-v2` |
| `handlePlaidExchangePublicTokenPost` | POST | `/api/plaid/exchange-public-token` |
| `handlePlaidExchangeV2Post` | POST | `/api/plaid/exchange-v2` |
| `handlePlaidLiabilitiesGet` | GET | `/api/plaid/liabilities` |
| `handlePlaidWebhookPost` | POST | `/api/webhooks/plaid` |
| `handlePortfolioMetricsGet` | GET | `/api/portfolio/metrics` |
| `handlePresenceHeartbeatPost` | POST | `/api/presence/heartbeat` |
| `handleProjectCommitmentDelete` | DELETE | `/api/projects/[id]/commitments/[cId]` |
| `handleProjectCommitmentPatch` | PATCH | `/api/projects/[id]/commitments/[cId]` |
| `handleProjectCommitmentsGet` | GET | `/api/projects/[id]/commitments` |
| `handleProjectCommitmentsPost` | POST | `/api/projects/[id]/commitments` |
| `handleProjectDealUpdatesGet` | GET | `/api/projects/[id]/dealUpdates` |
| `handleProjectDealUpdatesPost` | POST | `/api/projects/[id]/dealUpdates` |
| `handleProjectGet` | GET | `/api/projects/[id]` |
| `handleProjectKpisBreakdownGet` | GET | `/api/projects/[id]/kpis/breakdown` |
| `handleProjectKpisCurrentGet` | GET | `/api/projects/[id]/kpis/current` |
| `handleProjectKpisImpactPreviewGet` | GET | `/api/projects/[id]/kpis/impact-preview?transactionId=xxx` |
| `handleProjectKpisRecalculatePost` | POST | `/api/projects/[id]/kpis/recalculate` |
| `handleProjectPatch` | PATCH | `/api/projects/[id]` |
| `handleProjectProofOfFundsPost` | POST | `/api/projects/[id]/proof-of-funds` |
| `handleProjectsAcquisitionPatch` | PATCH | `/api/projects/[id]/acquisition` |
| `handleProjectsCapitalStackExportGet` | GET | `/api/projects/[id]/capital-stack/export` |
| `handleProjectsCreatePost` | POST | `/api/projects/create` |
| `handleProjectsDocumentDownloadGet` | GET | `/api/projects/[id]/documents/[docId]/download` |
| `handleProjectsDocumentsGet` | GET | `/api/projects/[id]/documents` |
| `handleProjectsDocumentsPost` | POST | `/api/projects/[id]/documents` |
| `handleProjectsExitPatch` | PATCH | `/api/projects/[id]/exit` |
| `handleProjectsHoldAutoAdvancePost` | POST | `/api/projects/[id]/hold/auto-advance` |
| `handleProjectsHoldPatch` | PATCH | `/api/projects/[id]/hold` |
| `handleProjectsHoldRegistryGet` | GET | `/api/projects/[id]/hold/registry` |
| `handleProjectsHoldRegistryPatch` | PATCH | `/api/projects/[id]/hold/registry` |
| `handleProjectsInquiryPatch` | PATCH | `/api/projects/[id]/inquiries/[inquiryId]` |
| `handleProjectsLenderPackageDebtFolderPost` | POST | `/api/projects/[id]/lender-package/debt-folder` |
| `handleProjectsLenderPackageGet` | GET | `/api/projects/[id]/lender-package` |
| `handleProjectsLenderPackageItemDelete` | DELETE | `/api/projects/[id]/lender-package/[itemId]` |
| `handleProjectsLenderPackageItemPatch` | PATCH | `/api/projects/[id]/lender-package/[itemId]` |
| `handleProjectsLenderPackagePost` | POST | `/api/projects/[id]/lender-package` |
| `handleProjectsListGet` | GET | `/api/projects` |
| `handleProjectsLoanEstimateChoosePost` | POST | `/api/projects/[id]/loan-estimates/[estimateId]/choose` |
| `handleProjectsLoanEstimateDelete` | DELETE | `/api/projects/[id]/loan-estimates/[estimateId]` |
| `handleProjectsLoanEstimatesGet` | GET | `/api/projects/[id]/loan-estimates` |
| `handleProjectsLoanEstimatesPost` | POST | `/api/projects/[id]/loan-estimates` |
| `handleProjectsLoansGet` | GET | `/api/projects/[id]/loans` |
| `handleProjectsLoansPost` | POST | `/api/projects/[id]/loans` |
| `handleProjectsPurchasePatch` | PATCH | `/api/projects/[id]/purchase` |
| `handleProjectsRehabPost` | POST | `/api/projects/rehab` |
| `handleProjectsTodosPost` | POST | `/api/projects/todos` |
| `handleProjectTimelineGet` | GET | `/api/projects/[id]/timeline` |
| `handleProjectTransactionsGet` | GET | `/api/projects/[id]/transactions` |
| `handleProjectVisibilityPatch` | PATCH | `/api/projects/[id]/visibility` |
| `handleReconciliationFinalizePost` | POST | `/api/reconciliations/[periodId]/finalize` |
| `handleReconciliationItemAdjustPost` | POST | `/api/reconciliations/items/[itemId]/adjust` |
| `handleReconciliationItemVerifyPost` | POST | `/api/reconciliations/items/[itemId]/verify` |
| `handleReconciliationMatchPost` | POST | `/api/reconciliations/[periodId]/match` |
| `handleReconciliationPeriodGet` | GET | `/api/reconciliations/[periodId]` |
| `handleReconciliationReportGet` | GET | `/api/reconciliations/[periodId]/report?format=json|html|pdf` |
| `handleReconciliationsGet` | GET | `/api/reconciliations` |
| `handleReconciliationsPost` | POST | `/api/reconciliations` |
| `handleReilClosingLedgerExportGet` | GET | `/api/reil/projects/[id]/closing-ledger/export` |
| `handleReilCronRefreshPost` | POST | `/api/reil/cron/refresh` |
| `handleReilListingsGet` | GET | `/api/reil/listings` |
| `handleReilMarketStatsGet` | GET | `/api/reil/market-stats` |
| `handleReilProjectAssignmentPatch` | PATCH | `/api/reil/projects/[id]/assignments/[aid]` |
| `handleReilProjectAssignmentsGet` | GET | `/api/reil/projects/[id]/assignments` |
| `handleReilProjectAssignmentsPost` | POST | `/api/reil/projects/[id]/assignments` |
| `handleReilProjectByIdGet` | GET | `/api/reil/projects/[id]` |
| `handleReilProjectByIdPatch` | PATCH | `/api/reil/projects/[id]` |
| `handleReilProjectInvitePost` | POST | `/api/reil/projects/[id]/invite` |
| `handleReilProjectPropertyPost` | POST | `/api/reil/projects/[id]/property` |
| `handleReilProjectsGet` | GET | `/api/reil/projects` |
| `handleReilProjectsPost` | POST | `/api/reil/projects` |
| `handleReilProjectStatusGet` | GET | `/api/reil/projects/[id]/status` |
| `handleReilProjectStatusPost` | POST | `/api/reil/projects/[id]/status` |
| `handleReilProjectTermsGet` | GET | `/api/reil/projects/[id]/terms` |
| `handleReilProjectTermsPost` | POST | `/api/reil/projects/[id]/terms` |
| `handleReilProjectValuationGet` | GET | `/api/reil/projects/[id]/valuation` |
| `handleReilProjectValuationPost` | POST | `/api/reil/projects/[id]/valuation` |
| `handleRentHistoryImportPost` | POST | `/api/rent-history/import` |
| `handleReportingExportPost` | POST | `/api/reporting/export` |
| `handleReportsGeneratePost` | POST | `/api/reports/generate` |
| `handleReportsPeriodGet` | GET | `/api/reports/[period]` |
| `handleReportsPortfolioGet` | GET | `/api/reports/portfolio` |
| `handleRulesApplyPost` | POST | `/api/rules/[id]/apply` |
| `handleRulesDelete` | DELETE | `/api/rules/[id]` |
| `handleRulesPost` | POST | `/api/rules` |
| `handleRulesProjectGet` | GET | `/api/rules/project/[projectId]` |
| `handleRulesProjectSuggestionsGet` | GET | `/api/rules/project/[projectId]/suggestions` |
| `handleRulesPut` | PUT | `/api/rules/[id]` |
| `handleSecuritySettingsGet` | GET | `/api/security/settings` |
| `handleSecuritySettingsPut` | PUT | `/api/security/settings` |
| `handleSendGridWebhookGet` | GET | `/api/webhooks/sendgrid` |
| `handleSendGridWebhookPost` | POST | `/api/webhooks/sendgrid` |
| `handleSessionDelete` | DELETE | `/api/auth/session` |
| `handleSessionPost` | POST | `/api/auth/session` |
| `handleSessionsGet` | GET | `/api/auth/sessions` |
| `handleSettingsDelete` | DELETE | `/api/settings/*` |
| `handleSettingsGet` | GET | `/api/settings/*` |
| `handleSettingsPost` | POST | `/api/settings/*` |
| `handleSettingsPut` | PUT | `/api/settings/*` |
| `handleStreetViewGet` | GET | `/api/street-view` |
| `handleStreetViewPost` | POST | `/api/street-view` |
| `handleStripeCheckoutPost` | POST | `/api/stripe/checkout` |
| `handleStripeInvoicesPost` | POST | `/api/stripe/invoices` |
| `handleStripePaymentMethodPost` | POST | `/api/stripe/payment-method` |
| `handleStripePortalPost` | POST | `/api/stripe/portal` |
| `handleStripeSessionStatusGet` | GET | `/api/stripe/session-status` |
| `handleStripeSubscriptionPost` | POST | `/api/stripe/subscription` |
| `handleStripeWebhookPost` | POST | `/api/stripe/webhook` |
| `handleTasksAssignPost` | POST | `/api/tasks/assign` |
| `handleTax1040EsPost` | POST | `/api/tax/1040-es` |
| `handleTaxPackagePost` | POST | `/api/tax/package` |
| `handleTaxShareGet` | GET | `/api/tax/share` |
| `handleTaxSharePost` | POST | `/api/tax/share` |
| `handleTaxShareRevokePost` | POST | `/api/tax/share/revoke` |
| `handleTaxShareTokenGet` | GET | `/api/tax/share/[token]` |
| `handleTeamDelete` | DELETE | `/api/team/*` |
| `handleTeamGet` | GET | `/api/team/*` |
| `handleTeamPost` | POST | `/api/team/*` |
| `handleTeamPut` | PUT | `/api/team/*` |
| `handleTransactionAttributionPatch` | PATCH | `/api/transactions/[id]/attribution` |
| `handleTransactionAttributionSearchPost` | POST | `/api/transactions/[id]/attribution/search` |
| `handleTransactionIdentificationSuggestionsGet` | GET | `/api/transactions/project/[projectId]/identification-suggestions` |
| `handleTransactionIdentifyPost` | POST | `/api/transactions/[id]/identify` |
| `handleUnsubscribePost` | POST | `/api/unsubscribe` |
| `handleUploadPost` | POST | `/api/upload` |
| `handleVendorPortalRequestsGet` | GET | `/api/vendor-portal/requests` |
| `handleVendorPortalRequestsPut` | PUT | `/api/vendor-portal/requests` |
| `handleVendorsGet` | GET | `/api/vendors` |
| `handleVendorsRequestPost` | POST | `/api/vendors/request` |
| `handleWaitlistPost` | POST | `/api/waitlist` |
| `handleWebhooksSourcingPost` | POST | `/api/webhooks/sourcing` |
| `handleWorkerDrainGet` | GET | `/api/worker/drain` |
| `handleWorkerDrainPost` | POST | `/api/worker/drain` |
| `handleWorkspaceGet` | GET | `/api/workspace` |
| `handleWorkspacePost` | POST | `/api/workspace/[action]` |
| `handleWorkspacePut` | PUT | `/api/workspace` |
| `handleZoningScanPost` | POST | `/api/zoning-scan` |

---

## 4. Dev auth shortcuts

| Persona | Login URL | Cookie |
|---|---|---|
| Investor | `/login` | `__session=mock_session_token_123` |
| Admin | `/login?accountType=admin&redirectTo=/admin` | `__acct=admin` |
| Vendor | `/login?accountType=vendor` | `__acct=vendor` |

---

## 5. Verification

```bash
npm run verify
npm run test --workspace=@paperworking/integration
k6 run tests/load/k6/smoke.js
```

See [PHASE_6_VERIFICATION.md](./PHASE_6_VERIFICATION.md).
