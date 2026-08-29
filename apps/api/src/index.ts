export { handleHealthGet, type HealthCheckDeps } from './routes/health/handler.js';
export {
  handleAttorneyStatesGet,
  type AttorneyStatesGetDeps,
  type AttorneyStatesReader,
} from './routes/config/attorney-states/handler.js';
export {
  handlePortfolioMetricsGet,
  type PortfolioMetricsQuery,
  type PortfolioMetricsDeps,
} from './routes/portfolio/metrics/handler.js';
export {
  handleReportsPortfolioGet,
  type ReportsPortfolioQuery,
  type ReportsPortfolioDeps,
  type AuthenticateFn,
} from './routes/reports/portfolio/handler.js';
export {
  handleReportsGeneratePost,
  type ReportsGenerateBody,
  type ReportsGenerateDeps,
} from './routes/reports/generate/handler.js';
export {
  handleInsightsGet,
  type InsightsGetQuery,
  type InsightsGetDeps,
  type LoadInsightsProjectsFn,
} from './routes/insights/handler.js';
export {
  handleSessionPost,
  handleSessionDelete,
  type SessionPostBody,
  type SessionPostDeps,
  type SessionDeleteDeps,
} from './routes/auth/session/handler.js';
export {
  handleSessionsGet,
  type SessionsListDeps,
  type SessionRecord,
  type RequireAuthFn,
  type AuthContext,
  type AuthFailure,
} from './routes/auth/sessions/handler.js';
export {
  handleProjectGet,
  type ProjectGetParams,
  type ProjectGetDeps,
  type ProjectDocument,
  type GetProjectByIdFn,
} from './routes/projects/get/handler.js';
export {
  handleAdminLenderRatesGet,
  type AdminLenderRatesGetDeps,
  type GetLenderRatesDocFn,
} from './routes/admin/lender-rates/handler.js';
export {
  handleAdminLenderChecklistsGet,
  type AdminLenderChecklistsGetDeps,
  type GetLenderChecklistsDocFn,
} from './routes/admin/lender-checklists/handler.js';
export {
  handleAdminRentcastUsageGet,
  type AdminRentcastUsageGetDeps,
  type RentcastUsageQuery,
  type CountRentcastCallsFn,
} from './routes/admin/rentcast-usage/handler.js';
export {
  handleAdminAgentCrewGet,
  type AdminAgentCrewGetDeps,
  type SyntheticAgentSummary,
  type ListSyntheticAgentsFn,
} from './routes/admin/agent-crew/handler.js';
export {
  type AdminAuthContext,
  type AdminAuthFailure,
  type RequireAdminFn,
  isAdminAuthFailure,
} from './lib/auth/admin-types.js';
export {
  handleMarketplaceListingsGet,
  type MarketplaceListingsGetDeps,
  type ListDealListingsFn,
} from './routes/marketplace/listings/handler.js';
export {
  handleMarketplaceProfileGet,
  type MarketplaceProfileGetDeps,
} from './routes/marketplace/profile/handler.js';
export {
  handleMarketplaceInvestorsGet,
  type MarketplaceInvestorsGetDeps,
} from './routes/marketplace/investors/handler.js';
export {
  handleMarketplaceInvestorByIdGet,
  type MarketplaceInvestorByIdGetDeps,
  type MarketplaceInvestorByIdParams,
} from './routes/marketplace/investors/get-by-id/handler.js';
export {
  handleMarketplaceInvestorsFollowPost,
  type MarketplaceInvestorsFollowDeps,
  type FollowInvestorBody,
} from './routes/marketplace/investors/follow/handler.js';
export {
  handleDealsGet,
  type DealsListGetDeps,
  type DealsGetQuery,
} from './routes/deals/list/handler.js';
export {
  handleDealsExistsGet,
  type DealsExistsGetDeps,
  type DealsExistsQuery,
} from './routes/deals/exists/handler.js';
export {
  handleDealsBroadcastPost,
  type DealsBroadcastPostDeps,
  type DealBroadcastBody,
} from './routes/deals/broadcast/handler.js';
export {
  publicDealsFor,
  redactDealForPublic,
  sanitizeProfileInput,
  type InvestorProfile,
} from './lib/marketplace/investor-profile.js';
export { filterAndSortDeals, type DealsListQuery } from './lib/deals/filter-deals.js';
export { normalizeDealStatus } from './lib/deals/statuses.js';
export {
  handleStripeWebhookPost,
  type StripeWebhookPostDeps,
} from './routes/stripe/webhook/handler.js';
export {
  handleStripeSessionStatusGet,
  type StripeSessionStatusGetDeps,
  type SessionStatusQuery,
} from './routes/stripe/session-status/handler.js';
export {
  handleStripeCheckoutPost,
  type StripeCheckoutPostDeps,
  type StripeCheckoutBody,
} from './routes/stripe/checkout/handler.js';
export {
  handleStripePortalPost,
  type StripePortalPostDeps,
} from './routes/stripe/portal/handler.js';
export {
  handleStripeInvoicesPost,
  type StripeInvoicesPostDeps,
} from './routes/stripe/invoices/handler.js';
export {
  handleStripeSubscriptionPost,
  type StripeSubscriptionPostDeps,
} from './routes/stripe/subscription/handler.js';
export {
  handleStripePaymentMethodPost,
  type StripePaymentMethodPostDeps,
} from './routes/stripe/payment-method/handler.js';
export {
  dispatchStripeWebhookEvent,
  type StripeWebhookDispatchDeps,
} from './lib/stripe/webhook/dispatch.js';
export {
  resolvePlanId,
  resolveStripePriceId,
  PLAN_CATALOG,
  getCanonicalPlanName,
  type PlanId,
  type BillingInterval,
} from './lib/stripe/plans.js';
export {
  shouldUseMockCheckout,
  createMockCheckoutSession,
  getMockSessionStatus,
} from './lib/stripe/mock-checkout.js';
export { mapStripeSubscriptionStatus, STRIPE_STATUS_MAP } from './lib/stripe/status-map.js';
export type { VerifyIdTokenFn, GetStripeCustomerIdFn } from './lib/auth/id-token-auth.js';
export {
  handleSendGridWebhookGet,
  handleSendGridWebhookPost,
  type SendGridWebhookPostDeps,
  type SendGridWebhookHeaders,
} from './routes/webhooks/sendgrid/handler.js';
export {
  handleInboundEmailsWebhookPost,
  type InboundEmailsWebhookPostDeps,
} from './routes/webhooks/emails/handler.js';
export { handleInboundEmailParsePost } from './routes/webhooks/inbound-email/handler.js';
export {
  handleEmailReplyPost,
  handleEmailReplyGet,
  type EmailReplyWebhookDeps,
  type DealMessagePayload,
} from './routes/webhooks/email-reply/handler.js';
export {
  verifySendGridSignature,
  isMockSendGridSignature,
} from './lib/email/sendgrid-signature.js';
export {
  mapSendGridEventType,
  parseSendGridWebhookPayload,
  SENDGRID_EVENT_STATUS_MAP,
  type EmailStatus,
} from './lib/email/sendgrid-events.js';
export {
  parseInboundEmailPayload,
  computeAbuseUserUpdates,
  stripQuotedHistoryAndSignatures,
} from './lib/email/inbound-email-parser.js';
export {
  handleCronProcessDeletionsGet,
  handleCronSendDigestGet,
  handleCronDailySyncGet,
  handleCronLifecycleAlertsGet,
  handleCronProcessDailyKpisGet,
  handleCronSnapshotsGet,
  handleCronBridgeSyncGet,
  handleCronConsentAuditGet,
  handleCronLenderPackageRemindersGet,
  handleCronRefreshPlaceIdsGet,
  handleCronSyncTransactionsGet,
  handleCronProcessTeamInvitesGet,
  handleCronRetryFailedConnectionsGet,
  handleCronSyncFinancialTransactionsGet,
  handleCronSyncPlaidLiabilitiesGet,
  handleCronSyncLiabilitiesGet,
  handleCronProcessEmailNotificationsGet,
  type BridgeSyncQuery,
} from './routes/cron/handlers.js';
export { verifyCronAuth, type CronAuthHeaders, type CronAuthMode } from './lib/cron/auth.js';
export { isBusinessHours, shouldRemindByCadence } from './lib/cron/utils.js';
export { executeCronJob } from './lib/cron/handler.js';
export {
  handleContactPost,
  type ContactPostDeps,
  type SupportTicketPayload,
} from './routes/public/contact/handler.js';
export {
  handleWaitlistPost,
  type WaitlistPostDeps,
  type WaitlistPostBody,
  type WaitlistRequestHeaders,
} from './routes/public/waitlist/handler.js';
export {
  handleUnsubscribePost,
  type UnsubscribePostDeps,
  type UnsubscribePostBody,
} from './routes/public/unsubscribe/handler.js';
export {
  handleBidsPost,
  handleBidsPut,
  type BidsPostDeps,
  type BidsPutDeps,
  type BidsPostBody,
  type BidsPutBody,
} from './routes/bids/handler.js';
export {
  handleVendorsGet,
  type VendorsGetDeps,
  type VendorsGetQuery,
} from './routes/vendors/handler.js';
export {
  handleIntegrationsStatusGet,
  type IntegrationsStatusGetDeps,
  type IntegrationsStatusResponse,
} from './routes/integrations/status/handler.js';
export {
  handlePlaidWebhookPost,
  type PlaidWebhookPostDeps,
  type PlaidWebhookHeaders,
  type PlaidWebhookProcessContext,
} from './routes/webhooks/plaid/handler.js';
export {
  validateContactForm,
  isValidWaitlistEmail,
  generateSupportTicketId,
} from './lib/public/forms.js';
export { filterVendorsBySearch, type VendorRecord } from './lib/vendors/filter.js';
export {
  createBidRequest,
  submitBidResponse,
  acceptBid,
  serviceTypeSchema,
  type BidRequest,
  type ServiceType,
  type BidStatus,
} from './lib/marketplace/bidding.js';
export {
  parsePlaidWebhookPayload,
  isTransactionSyncEvent,
  plaidEventType,
  type PlaidWebhookPayload,
} from './lib/webhooks/plaid-events.js';
export {
  handleAuthChangePasswordPost,
  type AuthChangePasswordPostDeps,
  type AuthChangePasswordBody,
} from './routes/auth/change-password/handler.js';
export {
  handleAuthResetPasswordPost,
  type AuthResetPasswordPostDeps,
  type AuthResetPasswordBody,
} from './routes/auth/reset-password/handler.js';
export {
  handleAuthMagicLinkPost,
  type AuthMagicLinkPostDeps,
  type AuthMagicLinkBody,
} from './routes/auth/magic-link/handler.js';
export {
  handleAuthTwoFaPost,
  type AuthTwoFaPostDeps,
  type AuthTwoFaPostBody,
} from './routes/auth/two-fa/handler.js';
export {
  handleDocuSignWebhookPost,
  type DocuSignWebhookPostDeps,
  type DocuSignWebhookHeaders,
} from './routes/webhooks/docusign/handler.js';
export {
  handlePlaidCreateLinkTokenPost,
  type PlaidCreateLinkTokenPostDeps,
  type PlaidCreateLinkTokenBody,
} from './routes/plaid/create-link-token/handler.js';
export {
  handleInvitationsRespondPost,
  type InvitationsRespondPostDeps,
  type InvitationRespondContext,
} from './routes/invitations/respond/handler.js';
export {
  validatePasswordChangeInput,
  validateResetPasswordEmail,
  RESET_PASSWORD_SUCCESS_MESSAGE,
  MAGIC_LINK_SUCCESS_MESSAGE,
} from './lib/auth/password.js';
export {
  parseTwoFaAction,
  isValidMockTotpCode,
  generateBackupCodes,
  buildOtpAuthUrl,
  TWO_FA_QR_SVG,
  type TwoFaAction,
} from './lib/auth/two-fa.js';
export {
  verifyDocuSignSignature,
  parseDocuSignWebhookEvent,
  mapDocuSignToESignStatus,
  mapDocuSignToCommitmentStatus,
  type DocuSignWebhookEvent,
} from './lib/webhooks/docusign-events.js';
export {
  validateInvitationRespondBody,
  buildInvitationStatusUpdate,
  isInvitationExpired,
  isCommitmentLocked,
  type InvitationRespondAction,
} from './lib/invitations/respond.js';
export {
  shouldUseMockPlaid,
  generateMockLinkToken,
  DEFAULT_PLAID_PRODUCTS,
  type CreateLinkTokenInput,
} from './lib/plaid/link-token.js';
export {
  handleFinancialTransactionsListGet,
  type FinancialTransactionsListGetDeps,
  type FinancialTransactionsListQuery,
} from './routes/financial-transactions/list/handler.js';
export {
  handleFinancialTransactionClassifyPost,
  type FinancialTransactionClassifyPostDeps,
  type FinancialTransactionClassifyBody,
} from './routes/financial-transactions/classify/handler.js';
export {
  handlePlaidConnectionsGet,
  type PlaidConnectionsGetDeps,
  type PlaidConnectionsGetQuery,
} from './routes/plaid/connections/handler.js';
export {
  handlePlaidConnectionDisconnectPost,
  type PlaidConnectionDisconnectPostDeps,
} from './routes/plaid/connections/disconnect/handler.js';
export {
  handleInvitationsBroadcastPost,
  type InvitationsBroadcastPostDeps,
  type InvitationsBroadcastBody,
} from './routes/invitations/broadcast/handler.js';
export {
  handleInvitationsTokenGet,
  type InvitationsTokenGetDeps,
  type InvitationsTokenGetContext,
} from './routes/invitations/token/handler.js';
export {
  handleInvitesPost,
  handleInvitesGet,
  type InvitesPostDeps,
  type InvitesGetDeps,
} from './routes/invites/handler.js';
export {
  handleProjectsCreatePost,
  type ProjectsCreatePostDeps,
} from './routes/projects/create/handler.js';
export {
  REVENUE_CATEGORIES,
  EXPENSE_CATEGORIES,
  categoriesForTab,
  formatFinancialTransaction,
  type FinancialTransactionTab,
} from './lib/financial-transactions/categories.js';
export {
  validateSplitAmounts,
  validateClassifyBody,
  type TransactionSplit,
} from './lib/financial-transactions/classify.js';
export {
  canSendProjectInvitations,
  deduplicateBroadcastRecipients,
  filterConsentedRecipients,
  applyInvitationTemplateVariables,
  computeProposedInvestmentTerms,
  type BroadcastRecipient,
} from './lib/invitations/broadcast.js';
export {
  buildGuestPortalResponse,
  validateInvitationTokenFormat,
  normalizeDealInvitation,
  type GuestPortalInvitation,
} from './lib/invitations/guest-portal.js';
export {
  createInviteSchema,
  canCreateDealInvite,
  buildInviteDocument,
  type CreateInviteInput,
} from './lib/invites/schema.js';
export {
  projectCreateSchema,
  calculateStorageQuotaBytes,
  phaseToCurrentPhase,
  isVendorAccount,
  STORAGE_TOTAL_LIMIT_BYTES,
  type ProjectCreateInput,
} from './lib/projects/create-schema.js';
export {
  handleProjectPatch,
  type ProjectPatchDeps,
  type PatchProjectFn,
} from './routes/projects/patch/handler.js';
export {
  handleFinancialTransactionApprovePost,
  type FinancialTransactionApprovePostDeps,
} from './routes/financial-transactions/approve/handler.js';
export {
  handleFinancialTransactionsBulkClassifyPost,
  type FinancialTransactionsBulkClassifyPostDeps,
  type FinancialTransactionsBulkClassifyBody,
} from './routes/financial-transactions/bulk-classify/handler.js';
export {
  handlePlaidExchangePost,
  type PlaidExchangePostDeps,
  type ExchangePlaidPublicTokenFn,
} from './routes/plaid/exchange/handler.js';
export {
  handleRulesPost,
  type RulesPostDeps,
} from './routes/rules/handler.js';
export {
  handleRulesPut,
  handleRulesDelete,
  type RulesByIdPutDeps,
  type RulesByIdDeleteDeps,
} from './routes/rules/by-id/handler.js';
export {
  handleRulesProjectGet,
  type RulesProjectGetDeps,
} from './routes/rules/project/handler.js';
export {
  handleReconciliationsPost,
  handleReconciliationsGet,
  type ReconciliationsPostDeps,
  type ReconciliationsGetDeps,
  type ReconciliationsGetQuery,
} from './routes/reconciliations/handler.js';
export {
  projectPatchBodySchema,
  detectMaterialProjectChanges,
  mergeProjectFinancials,
  buildProjectPatchPayload,
  type MaterialChangeResult,
} from './lib/projects/patch-schema.js';
export { validateBulkClassifyBody } from './lib/financial-transactions/bulk-classify.js';
export {
  parsePlaidExchangeBody,
  resolvePlaidConnectionPurpose,
  VALID_PLAID_CONNECTION_PURPOSES,
  type ParsedPlaidExchangeBody,
  type PlaidExchangeSuccess,
} from './lib/plaid/exchange.js';
export {
  validateCreateRuleBody,
  buildRuleUpdatePatch,
  validateRuleId,
  type CreateRuleInput,
} from './lib/rules/validation.js';
export {
  validateStartReconciliationBody,
  parseReconciliationListQuery,
  type StartReconciliationInput,
  type ReconciliationListQuery,
} from './lib/reconciliations/validation.js';
export {
  handleMessagesGet,
  handleMessagesPost,
  type MessagesGetDeps,
  type MessagesPostDeps,
  type MessagesGetQuery,
} from './routes/messages/handler.js';
export {
  handleMessageReadPatch,
  type MessageReadPatchDeps,
} from './routes/messages/read/handler.js';
export {
  handleDashboardGet,
  type DashboardGetDeps,
  type DashboardGetQuery,
} from './routes/dashboard/handler.js';
export {
  handleReconciliationPeriodGet,
  type ReconciliationPeriodGetDeps,
} from './routes/reconciliations/period/handler.js';
export {
  handleReconciliationFinalizePost,
  type ReconciliationFinalizePostDeps,
} from './routes/reconciliations/finalize/handler.js';
export {
  handleReconciliationMatchPost,
  type ReconciliationMatchPostDeps,
} from './routes/reconciliations/match/handler.js';
export {
  handleReconciliationItemVerifyPost,
  type ReconciliationItemVerifyPostDeps,
} from './routes/reconciliations/items/verify/handler.js';
export {
  handleWorkspaceGet,
  handleWorkspacePut,
  handleWorkspacePost,
  type WorkspaceGetDeps,
  type WorkspacePutDeps,
  type WorkspacePostDeps,
} from './routes/workspace/handler.js';
export {
  handleNotificationPreferencesGet,
  handleNotificationPreferencesPut,
  type NotificationPreferencesGetDeps,
  type NotificationPreferencesPutDeps,
} from './routes/user/notification-preferences/handler.js';
export {
  handleSecuritySettingsGet,
  handleSecuritySettingsPut,
  type SecuritySettingsGetDeps,
  type SecuritySettingsPutDeps,
} from './routes/security/settings/handler.js';
export {
  buildSparklineMetric,
  countProjectsByPhase,
  type SparklineMetric,
} from './lib/dashboard/sparkline.js';
export {
  groupMessagesIntoThreads,
  validateCreateMessageBody,
  generateMessageId,
  generateThreadId,
  type MessageThreadSummary,
} from './lib/messages/threads.js';
export {
  validateWorkspaceLogoUpload,
  validateWorkspaceDeleteConfirmation,
  buildWorkspaceUpdatePatch,
  parseWorkspaceAction,
  computeDeletionScheduleDate,
} from './lib/workspace/validation.js';
export {
  notificationPreferencesSchema,
  normalizeNotificationPreferences,
  type NotificationPreferencesPatch,
} from './lib/user/notification-preferences.js';
export {
  buildSecuritySettingsUpdate,
  shouldInvalidateSessionsOnSsoEnable,
  DEFAULT_SECURITY_SETTINGS,
  type SecuritySettings,
} from './lib/security/settings.js';
export {
  handleUploadPost,
  type UploadPostDeps,
} from './routes/upload/handler.js';
export {
  handleEntitlementsProjectCountGet,
  type EntitlementsProjectCountGetDeps,
} from './routes/entitlements/project-count/handler.js';
export {
  handleTasksAssignPost,
  type TasksAssignPostDeps,
} from './routes/tasks/assign/handler.js';
export {
  handlePlacesValidatePost,
  type PlacesValidatePostDeps,
} from './routes/places/validate/handler.js';
export {
  handleProjectVisibilityPatch,
  type ProjectVisibilityPatchDeps,
} from './routes/projects/visibility/handler.js';
export {
  handleReconciliationItemAdjustPost,
  type ReconciliationItemAdjustPostDeps,
} from './routes/reconciliations/items/adjust/handler.js';
export {
  handleReconciliationReportGet,
  type ReconciliationReportGetDeps,
  type ReconciliationReportGetQuery,
} from './routes/reconciliations/report/handler.js';
export {
  handleRentHistoryImportPost,
  type RentHistoryImportPostDeps,
} from './routes/rent-history/import/handler.js';
export {
  handleStreetViewGet,
  handleStreetViewPost,
  type StreetViewGetDeps,
  type StreetViewPostDeps,
} from './routes/street-view/handler.js';
export {
  validateUploadQuota,
  DEFAULT_ACCOUNT_QUOTA_BYTES,
  calculateProjectQuota,
} from './lib/storage/quota.js';
export {
  getCategoryByFilename,
  type DocumentCategory,
} from './lib/storage/categories.js';
export {
  validateUploadInput,
  ALLOWED_UPLOAD_EXTENSIONS,
  buildUploadStoragePath,
} from './lib/upload/validation.js';
export {
  parseAddressFallback,
  mapGoogleValidationResponse,
} from './lib/places/validate.js';
export { validateVisibilityPatch } from './lib/projects/visibility.js';
export {
  validateTaskAssignBody,
  isTaskAssignBlocked,
  TASK_ASSIGN_UPGRADE_RESPONSE,
} from './lib/tasks/assign.js';
export {
  expandListingsToRentPayments,
  type RentalListing,
  type RentPayment,
} from './lib/rent-history/payments.js';
export {
  parseStreetViewQuery,
  parseStreetViewCoordinates,
  buildStreetViewStaticUrl,
  buildStreetViewMetadataUrl,
} from './lib/maps/street-view-params.js';
export {
  handleProjectTimelineGet,
  type ProjectTimelineGetDeps,
} from './routes/projects/timeline/handler.js';
export {
  handleProjectCommitmentsGet,
  handleProjectCommitmentsPost,
  type ProjectCommitmentsGetDeps,
  type ProjectCommitmentsPostDeps,
  type VerifyProjectAccessFn,
} from './routes/projects/commitments/handler.js';
export {
  handleProjectCommitmentPatch,
  handleProjectCommitmentDelete,
  type ProjectCommitmentByIdDeps,
} from './routes/projects/commitments/by-id/handler.js';
export {
  handleProjectKpisCurrentGet,
  type ProjectKpisCurrentGetDeps,
} from './routes/projects/kpis/current/handler.js';
export {
  handleProjectKpisBreakdownGet,
  type ProjectKpisBreakdownGetDeps,
  type ProjectKpisBreakdownGetQuery,
} from './routes/projects/kpis/breakdown/handler.js';
export {
  handleProjectKpisImpactPreviewGet,
  type ProjectKpisImpactPreviewGetDeps,
  type ProjectKpisImpactPreviewGetQuery,
} from './routes/projects/kpis/impact-preview/handler.js';
export {
  handleProjectKpisRecalculatePost,
  type ProjectKpisRecalculatePostDeps,
} from './routes/projects/kpis/recalculate/handler.js';
export {
  handleProjectDealUpdatesGet,
  handleProjectDealUpdatesPost,
  type ProjectDealUpdatesGetDeps,
  type ProjectDealUpdatesPostDeps,
} from './routes/projects/deal-updates/handler.js';
export {
  handleProjectTransactionsGet,
  type ProjectTransactionsGetDeps,
  type ProjectTransactionsQuery,
} from './routes/projects/transactions/handler.js';
export {
  handleProjectProofOfFundsPost,
  type ProjectProofOfFundsPostDeps,
} from './routes/projects/proof-of-funds/handler.js';
export {
  COMMITMENT_STATUSES,
  COMMITMENT_PARTY_TYPES,
  validateCreateCommitmentBody,
  validatePatchCommitmentFields,
  filterCommitmentsForViewer,
  userOwnsCommitment,
} from './lib/commitments/validation.js';
export {
  filterTimelineActivities,
  sortTimelineDescending,
  isLeadInvestorOrTeammateRole,
  type TimelineActivity,
} from './lib/timeline/filter.js';
export { validateDealUpdateBody } from './lib/deal-updates/validation.js';
export {
  parseProjectTransactionsQuery,
  computeTransactionsNextCursor,
} from './lib/projects/transactions-query.js';
export {
  mapRecentActivityFromTransactions,
  buildMockKpiTrends,
  aggregateKpiBreakdown,
} from './lib/projects/kpis.js';
export {
  validateProofOfFundsBody,
  computeCompletedFundCards,
  PROOF_OF_FUNDS_ACTIONS,
} from './lib/proof-of-funds/actions.js';
export {
  handleTaxPackagePost,
  type TaxPackagePostDeps,
} from './routes/tax/package/handler.js';
export {
  handleTax1040EsPost,
  type Tax1040EsPostDeps,
} from './routes/tax/1040-es/handler.js';
export {
  handleRulesApplyPost,
  type RulesApplyPostDeps,
} from './routes/rules/apply/handler.js';
export { handleAuthIpGet, type AuthIpGetDeps } from './routes/auth/ip/handler.js';
export {
  handleAuthRevokePost,
  type AuthRevokePostDeps,
} from './routes/auth/revoke/handler.js';
export {
  handleAccountDataDownloadPost,
  type AccountDataDownloadPostDeps,
} from './routes/account/data/download/handler.js';
export {
  handleAccountDataDeleteGet,
  handleAccountDataDeletePost,
  type AccountDataDeleteGetDeps,
  type AccountDataDeletePostDeps,
} from './routes/account/data/delete/handler.js';
export {
  handleEmailsSendPost,
  type EmailsSendPostDeps,
} from './routes/emails/send/handler.js';
export {
  handleEsignCreatePost,
  type EsignCreatePostDeps,
} from './routes/esign/create/handler.js';
export {
  handleEsignStatusGet,
  type EsignStatusGetDeps,
} from './routes/esign/status/handler.js';
export {
  handleFundCloseDealPost,
  type FundCloseDealPostDeps,
} from './routes/fund/close-deal/handler.js';
export {
  handleExitCompletePost,
  type ExitCompletePostDeps,
} from './routes/exit/complete/handler.js';
export { extractClientIp } from './lib/auth/ip.js';
export { validateSendEmailBody } from './lib/emails/send.js';
export {
  validateCreateEnvelopeBody,
  mapEnvelopeStatusToDocStatus,
  TERMINAL_ENVELOPE_STATUSES,
} from './lib/esign/validation.js';
export {
  buildSampleTaxDatapoints,
  parseTaxPackageRequest,
  DEFAULT_TAX_PACKAGE_FORMS,
} from './lib/tax/schema.js';
export {
  parseCloseDealBody,
  validateSourcesUsesBalance,
} from './lib/fund/close-deal.js';
export {
  parseExitCompleteBody,
  computeExitWaterfall,
} from './lib/exit/complete.js';
export {
  validateCreateInboxItemBody,
  buildInboxItemDocument,
  buildInboxItemUpdate,
  generateInboxItemId,
  isInboxAction,
  appendProjectNote,
  isInboxBackfillAdmin,
  INBOX_ACTIONS,
} from './lib/inbox/validation.js';
export {
  parseFinancialTransactionsQuery,
  formatFinancialTransactionRow,
} from './lib/financial-transactions/filters.js';
export {
  deriveChainOfTitleStatus,
  validateTitleSearchBody,
} from './lib/closing/title-search.js';
export {
  validateInvitationAskBody,
  buildInvestorInquiryMessage,
} from './lib/invitations/token-ask.js';
export {
  filterInvestorTimeline,
  sortTimelineNewestFirst,
} from './lib/investor/timeline.js';
export { buildChangelogMetadata } from './lib/changelog/metadata.js';
export {
  handleInboxPost,
  type InboxPostDeps,
} from './routes/inbox/handler.js';
export {
  handleInboxByIdPatch,
  handleInboxByIdDelete,
  type InboxByIdDeps,
} from './routes/inbox/by-id/handler.js';
export {
  handleInboxActionsPost,
  type InboxActionsPostDeps,
} from './routes/inbox/actions/handler.js';
export {
  handleInboxBackfillPost,
  type InboxBackfillPostDeps,
} from './routes/inbox/backfill/handler.js';
export {
  handleFinancialTransactionsByProjectGet,
  type FinancialTransactionsByProjectGetDeps,
} from './routes/financial-transactions/by-project/handler.js';
export {
  handleTransactionIdentifyPost,
  type TransactionIdentifyPostDeps,
} from './routes/transactions/identify/handler.js';
export {
  handleTransactionAttributionPatch,
  handleTransactionAttributionSearchPost,
  type TransactionAttributionPatchDeps,
  type TransactionAttributionSearchPostDeps,
} from './routes/transactions/attribution/handler.js';
export {
  handleTransactionIdentificationSuggestionsGet,
  type TransactionIdentificationSuggestionsGetDeps,
} from './routes/transactions/identification-suggestions/handler.js';
export {
  handleInvestorTimelineGet,
  type InvestorTimelineGetDeps,
} from './routes/investor/timeline/handler.js';
export {
  handleChangelogMetadataGet,
  type ChangelogMetadataGetDeps,
} from './routes/changelog/metadata/handler.js';
export {
  handleClosingTitleSearchPost,
  type ClosingTitleSearchPostDeps,
} from './routes/closing/title-search/handler.js';
export {
  handleInvitationsTokenAskPost,
  type InvitationsTokenAskPostDeps,
} from './routes/invitations/ask/handler.js';
export {
  validateIndicationBody,
  buildIndicationUpdate,
  formatIndicationValue,
  checkInvitationNotExpired,
} from './lib/invitations/indication.js';
export {
  validateSubscribeBody,
  buildNewSubscriberContact,
} from './lib/invitations/subscribe.js';
export {
  validateUpdatesToken,
  formatDealUpdateRow,
} from './lib/invitations/updates.js';
export {
  validateSubscriptionToken,
  checkSubscriptionInvitationExpiry,
  buildCommitmentSignedTransition,
} from './lib/invitations/subscription.js';
export {
  validateSendInvitationBody,
  canSendInvitation,
  generateInvitationToken,
  buildInvitationRecord,
  buildInviteUrl,
  INVITE_ROLES,
} from './lib/invitations/send.js';
export {
  handleInvitationsIndicationPost,
  handleInvitationsIndicationDelete,
  type InvitationsIndicationDeps,
} from './routes/invitations/indication/handler.js';
export {
  handleInvitationsSubscribePost,
  type InvitationsSubscribePostDeps,
} from './routes/invitations/subscribe/handler.js';
export {
  handleInvitationsUpdatesGet,
  type InvitationsUpdatesGetDeps,
} from './routes/invitations/updates/handler.js';
export {
  handleInvitationsSubscriptionPost,
  type InvitationsSubscriptionPostDeps,
} from './routes/invitations/subscription/handler.js';
export {
  handleInvitationsSendPost,
  type InvitationsSendPostDeps,
} from './routes/invitations/send/handler.js';
export {
  parseTrendsQuery,
  generateLastNMonths,
  buildTrendsCacheKey,
  buildOccupancyTrendSeries,
  buildTransactionTrendSeries,
  TREND_OPEX_CATEGORIES,
} from './lib/insights/trends.js';
export {
  parseMarketQuery,
  buildMarketCacheKey,
  extractProjectZipCode,
  generateLastNQuarters,
  getQuarterKey,
  buildProjectMarketSeries,
  buildMarketStatsSeries,
} from './lib/insights/market.js';
export {
  getBenchmarkColor,
  computeTrendDirection,
  parseMetricsQuery,
  buildMetricsCacheKey,
  mapNullReasonToMissingData,
  METRIC_NULL_REASON_MAP,
} from './lib/insights/metrics-display.js';
export {
  validateAcceptToken,
  checkInvitationAcceptable,
  buildAcceptInvitationResponse,
} from './lib/invitations/accept.js';
export { LEGACY_INVEST_RESPONSE } from './lib/invest/legacy.js';
export {
  validateThreadId,
  formatThreadMessagesResponse,
} from './lib/messages/thread.js';
export {
  validatePlaceDetailsBody,
  validateAutocompleteBody,
  validatePublicAutocompleteBody,
  stripPublicPredictions,
  PLACES_CORS_HEADERS,
} from './lib/places/autocomplete.js';
export {
  handleInsightsPortfolioGet,
  type InsightsPortfolioGetDeps,
} from './routes/insights/portfolio/handler.js';
export {
  handleInsightsTrendsGet,
  type InsightsTrendsGetDeps,
} from './routes/insights/trends/handler.js';
export {
  handleInsightsMetricsGet,
  type InsightsMetricsGetDeps,
} from './routes/insights/metrics/handler.js';
export {
  handleInsightsMarketGet,
  type InsightsMarketGetDeps,
} from './routes/insights/market/handler.js';
export {
  handleRulesProjectSuggestionsGet,
  type RulesProjectSuggestionsGetDeps,
} from './routes/rules/project/suggestions/handler.js';
export {
  handleInvitationsAcceptGet,
  type InvitationsAcceptGetDeps,
} from './routes/invitations/accept/handler.js';
export {
  handleInvestTokenGet,
  handleInvestTokenPost,
} from './routes/invest/token/handler.js';
export {
  handleMessagesThreadGet,
  type MessagesThreadGetDeps,
} from './routes/messages/thread/handler.js';
export {
  handlePlacesDetailsPost,
  type PlacesDetailsPostDeps,
} from './routes/places/details/handler.js';
export {
  handlePlacesAutocompletePost,
  type PlacesAutocompletePostDeps,
} from './routes/places/autocomplete/handler.js';
export {
  handlePlacesAutocompletePublicPost,
  handlePlacesAutocompletePublicOptions,
  type PlacesAutocompletePublicPostDeps,
} from './routes/places/autocomplete-public/handler.js';
export {
  flattenMortgageLiabilities,
  formatMortgageLiabilityRow,
} from './lib/plaid/liabilities.js';
export { verifyPlaidConnectionOwnership } from './lib/plaid/connection.js';
export {
  validateNotificationTestBody,
  NOTIFICATION_TEST_TEMPLATES,
  prefixTestEmailSubject,
} from './lib/notifications/test.js';
export {
  validatePropertyLookupBody,
  isE2ETestContext,
} from './lib/deal-analyzer/property-lookup.js';
export {
  validateLoiGenerateBody,
  buildLoiDocumentRecord,
  loiPdfFilename,
} from './lib/loi/generate.js';
export { filterProjectsByQuery } from './lib/projects/list.js';
export {
  extractRECs,
  validateZoningScanBody,
  buildZoningScanResult,
} from './lib/zoning/scan.js';
export {
  canCreateShareLink,
  createShareTokenRecord,
  validatePackageTokenAccess,
  validatePackageShareCreateBody,
  assemblePackageByType,
} from './lib/packages/share.js';
export {
  handlePlaidLiabilitiesGet,
  type PlaidLiabilitiesGetDeps,
} from './routes/plaid/liabilities/handler.js';
export { handlePlaidExchangePublicTokenPost } from './routes/plaid/exchange-public-token/handler.js';
export {
  handlePlaidConnectionByIdDelete,
  type PlaidConnectionByIdDeleteDeps,
} from './routes/plaid/connections/by-id/handler.js';
export {
  handlePlaidConnectionPausePost,
  handlePlaidConnectionPauseDelete,
  type PlaidConnectionPauseDeps,
} from './routes/plaid/connections/pause/handler.js';
export {
  handleNotificationsTestPost,
  type NotificationsTestPostDeps,
} from './routes/notifications/test/handler.js';
export {
  handleDealAnalyzerPropertyLookupPost,
  type DealAnalyzerPropertyLookupPostDeps,
} from './routes/deal-analyzer/property-lookup/handler.js';
export {
  handleLoiGeneratePost,
  type LoiGeneratePostDeps,
} from './routes/loi/generate/handler.js';
export {
  handleZoningScanPost,
  type ZoningScanPostDeps,
} from './routes/zoning-scan/handler.js';
export {
  handlePackagesSharePost,
  handlePackagesShareDelete,
  type PackagesSharePostDeps,
  type PackagesShareDeleteDeps,
} from './routes/packages/share/handler.js';
export {
  handlePackagesShareTokenGet,
  type PackagesShareTokenGetDeps,
} from './routes/packages/share/token/handler.js';
export {
  handleProjectsListGet,
  type ProjectsListGetDeps,
  type ProjectsListGetQuery,
} from './routes/projects/list/handler.js';
export {
  handleEventsStreamGet,
  type EventsStreamGetDeps,
  type SseSubscribeFn,
  type SseUnsubscribeFn,
} from './routes/events/stream/handler.js';
export {
  handleAdminAgentCrewByIdGet,
  handleAdminAgentCrewByIdDelete,
  type AdminAgentCrewByIdGetDeps,
  type AdminAgentCrewByIdDeleteDeps,
} from './routes/admin/agent-crew/by-id/handler.js';
export {
  handleAdminAgentCrewPurgeAllDelete,
  type AdminAgentCrewPurgeAllDeleteDeps,
} from './routes/admin/agent-crew/purge-all/handler.js';
export {
  handleAdminAgentCrewImpersonatePost,
  type AdminAgentCrewImpersonatePostDeps,
} from './routes/admin/agent-crew/impersonate/handler.js';
export {
  handleProjectsDocumentsGet,
  handleProjectsDocumentsPost,
  type ProjectsDocumentsGetDeps,
  type ProjectsDocumentsPostDeps,
} from './routes/projects/documents/handler.js';
export {
  handleProjectsDocumentDownloadGet,
  type ProjectsDocumentDownloadGetDeps,
} from './routes/projects/documents/download/handler.js';
export {
  handleProjectsInquiryPatch,
  type ProjectsInquiryPatchDeps,
} from './routes/projects/inquiries/handler.js';
export {
  handleFinancialTransactionsGet,
  handleFinancialTransactionsPost,
  type FinancialTransactionsGetDeps,
  type FinancialTransactionsPostDeps,
} from './routes/financial/transactions/handler.js';
export {
  handleProjectsCapitalStackExportGet,
  type ProjectsCapitalStackExportGetDeps,
} from './routes/projects/capital-stack/export/handler.js';
export {
  formatSseEvent,
  formatSseHeartbeat,
  projectEventChannel,
  validateEventsStreamQuery,
  SSE_PROJECT_EVENTS,
  SSE_HEARTBEAT_MS,
  type SseProjectEvent,
} from './lib/events/sse.js';
export {
  buildImpersonationCookies,
  buildPurgeAllSummary,
} from './lib/admin/agent-crew.js';
export {
  getFolderForDocument,
  getPhaseForDocument,
  sanitizeDocumentFilename,
  validateDocumentUpload,
  buildDocumentDownloadPath,
  VENDOR_SLOT_FOLDER_MAPPING,
  type DocumentFolder,
} from './lib/projects/documents.js';
export {
  validateInquiryPatchBody,
  buildQnaSharedLedgerEvent,
} from './lib/projects/inquiries.js';
export {
  parseFinancialTransactionsListQuery,
  validateManualFinancialTransactionBody,
  buildFinancialTransactionsPagination,
  serializeFinancialTransactionRow,
  FINANCIAL_TX_DIRECTIONS,
  FINANCIAL_TX_STATUSES,
  FINANCIAL_TX_SOURCES,
} from './lib/financial/transactions.js';
export {
  handleTeamGet,
  handleTeamPost,
  handleTeamPut,
  handleTeamDelete,
  type TeamHandlerDeps,
} from './routes/team/handler.js';
export {
  handleBillingGet,
  handleBillingPost,
  handleBillingPut,
  handleBillingDelete,
  type BillingHandlerDeps,
} from './routes/billing/handler.js';
export {
  handleDataGet,
  handleDataPost,
  type DataHandlerDeps,
} from './routes/data/handler.js';
export {
  handleSettingsGet,
  handleSettingsPut,
  handleSettingsPost,
  handleSettingsDelete,
  type SettingsHandlerDeps,
} from './routes/settings/handler.js';
export {
  handleIntegrationsActionGet,
  handleIntegrationsActionDelete,
  type IntegrationsActionHandlerDeps,
} from './routes/integrations/action/handler.js';
export {
  handleIntegrationsGoogleDriveAuthorizeGet,
  handleIntegrationsGoogleDriveCallbackGet,
  type IntegrationsGoogleDriveAuthorizeGetDeps,
  type IntegrationsGoogleDriveCallbackGetDeps,
} from './routes/integrations/google-drive/handler.js';
export {
  handleIntegrationsMlsConnectPost,
  type IntegrationsMlsConnectPostDeps,
} from './routes/integrations/mls/connect/handler.js';
export {
  handleCalendarAuthGet,
  handleCalendarCallbackGet,
  handleCalendarEventsGet,
  handleCalendarSyncPost,
  type CalendarAuthGetDeps,
  type CalendarCallbackGetDeps,
  type CalendarEventsGetDeps,
  type CalendarSyncPostDeps,
} from './routes/calendar/handler.js';
export {
  handleMcpTransportGet,
  handleMcpTransportPost,
  type McpTransportHandlerDeps,
} from './routes/mcp/transport/handler.js';
export {
  isUserAdmin,
  validateTeamInviteBody,
  validateTeamRoleUpdateBody,
  countOtherActiveAdmins,
  TEAM_SETTINGS_ROLES,
} from './lib/team/helpers.js';
export {
  validateChangePlanBody,
  buildChangePlanUpdate,
  buildCancelSubscriptionResult,
  buildPaymentMethodFromBody,
  addPaymentMethod,
  setDefaultPaymentMethod,
  removePaymentMethod,
  resolvePaymentMethodId,
  buildInvoicePdfStub,
  type BillingPaymentMethod,
} from './lib/billing/helpers.js';
export {
  computeExportJobStatus,
  serializeExportHistoryItem,
  EXPORT_STATUS_THRESHOLDS_SEC,
  type ExportJobRecord,
} from './lib/data/export.js';
export {
  parseSettingsSection,
  buildProfileResponse,
  buildBillingSettingsResponse,
  validateBillingContactUpdate,
  buildProfileUpdate,
  buildWorkspaceSettingsResponse,
  buildSecuritySettingsResponse,
  buildDataPrivacyExportAttachment,
  buildIntegrationConnectUpdates,
  buildIntegrationDisconnectUpdates,
  validateWorkspaceDeletionConfirm,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './lib/settings/sections.js';
export {
  buildMockOAuthCallbackUrl,
  buildIntegrationCallbackHtml,
  buildGoogleDriveCallbackHtml,
  parseIntegrationActionPath,
} from './lib/integrations/oauth.js';
export {
  mapCalendarEvents,
  validateCalendarSyncBody,
  isInvalidGrantError,
  buildCalendarEventTimes,
  CALENDAR_EVENT_COLORS,
  type CalendarEventType,
} from './lib/calendar/helpers.js';
export {
  validateMcpAuthorization,
  MCP_TOOL_NAMES,
} from './lib/mcp/auth.js';
export {
  handleBridgeSearchGet,
  type BridgeSearchGetDeps,
} from './routes/bridge/search/handler.js';
export {
  handleBridgeAgentsGet,
  type BridgeAgentsGetDeps,
} from './routes/bridge/agents/handler.js';
export {
  handleBridgeOfficesGet,
  type BridgeOfficesGetDeps,
} from './routes/bridge/offices/handler.js';
export {
  handleBridgeOpenhousesGet,
  type BridgeOpenhousesGetDeps,
} from './routes/bridge/openhouses/handler.js';
export {
  handleBridgeMetadataGet,
  type BridgeMetadataGetDeps,
} from './routes/bridge/metadata/handler.js';
export {
  handleBridgeSyncGet,
  handleBridgeSyncPost,
  type BridgeSyncGetDeps,
  type BridgeSyncPostDeps,
} from './routes/bridge/sync/handler.js';
export {
  handleBridgeWebhookPost,
  type BridgeWebhookPostDeps,
} from './routes/webhooks/bridge/handler.js';
export {
  handleWorkerDrainGet,
  handleWorkerDrainPost,
  type WorkerDrainGetDeps,
  type WorkerDrainPostDeps,
} from './routes/worker/drain/handler.js';
export {
  handleProjectsRehabPost,
  type ProjectsRehabPostDeps,
} from './routes/projects/rehab/handler.js';
export {
  handleProjectsTodosPost,
  type ProjectsTodosPostDeps,
} from './routes/projects/todos/handler.js';
export {
  handleProjectsLenderPackageGet,
  handleProjectsLenderPackagePost,
  type ProjectsLenderPackageGetDeps,
  type ProjectsLenderPackagePostDeps,
} from './routes/projects/lender-package/handler.js';
export {
  handleProjectsLoansGet,
  handleProjectsLoansPost,
  type ProjectsLoansGetDeps,
  type ProjectsLoansPostDeps,
} from './routes/projects/loans/handler.js';
export {
  handleProjectsLoanEstimateChoosePost,
  type ProjectsLoanEstimateChoosePostDeps,
} from './routes/projects/loan-estimates/choose/handler.js';
export {
  handleProjectsLoanEstimatesGet,
  handleProjectsLoanEstimatesPost,
  handleProjectsLoanEstimateDelete,
  type ProjectsLoanEstimatesGetDeps,
  type ProjectsLoanEstimatesPostDeps,
  type ProjectsLoanEstimateDeleteDeps,
} from './routes/projects/loan-estimates/handler.js';
export {
  handleProjectsLenderPackageItemPatch,
  handleProjectsLenderPackageItemDelete,
  handleProjectsLenderPackageDebtFolderPost,
  type ProjectsLenderPackageItemPatchDeps,
  type ProjectsLenderPackageItemDeleteDeps,
  type ProjectsLenderPackageDebtFolderPostDeps,
} from './routes/projects/lender-package/by-id/handler.js';
export {
  handleProjectsAcquisitionPatch,
  handleProjectsPurchasePatch,
  handleProjectsHoldPatch,
  handleProjectsHoldRegistryGet,
  handleProjectsHoldRegistryPatch,
  handleProjectsExitPatch,
  type ProjectPhasePatchDeps,
} from './routes/projects/phases/handler.js';
export {
  handleReilProjectsGet,
  handleReilProjectsPost,
  handleReilProjectByIdGet,
  handleReilProjectByIdPatch,
  type ReilProjectsGetDeps,
  type ReilProjectsPostDeps,
  type ReilProjectByIdGetDeps,
  type ReilProjectByIdPatchDeps,
} from './routes/reil/projects/handler.js';
export {
  handleReilProjectAssignmentsGet,
  handleReilProjectAssignmentsPost,
  handleReilProjectAssignmentPatch,
  handleReilProjectStatusGet,
  handleReilProjectStatusPost,
  handleReilProjectTermsGet,
  handleReilProjectTermsPost,
  handleReilProjectInvitePost,
} from './routes/reil/projects/subroutes/handler.js';
export {
  handleIdentityClaimStartPost,
  handleIdentityClaimVerifyPost,
  handleIdentityClaimBindTokenPost,
  handleIdentityAppealPost,
  handleIdentityReportSpamPost,
} from './routes/identity/handler.js';
export {
  handleTaxSharePost,
  handleTaxShareGet,
  handleTaxShareTokenGet,
  handleTaxShareRevokePost,
} from './routes/tax/share/handler.js';
export {
  canReadReilProject,
  canWriteReilProject,
} from './lib/reil/access.js';
export {
  validateReilAssignmentBody,
  validateReilStatusBody,
  validateReilInviteBody,
  validateReilTermsBody,
} from './lib/reil/validation.js';
export {
  buildPhasePatchUpdate,
  filterPurchaseFinancingFields,
  PURCHASE_FINANCING_FIELDS,
} from './lib/projects/phases.js';
export {
  validateLoanEstimateCreateBody,
  canAddLoanEstimate,
} from './lib/projects/loan-estimates.js';
export { buildLenderPackageItemPatch } from './lib/projects/lender-package-item.js';
export {
  mergeHoldRegistryUpdate,
  buildExitRealizedPayload,
  validateExitStatus,
  validateAssignmentStatusPatch,
  CANONICAL_PROJECT_STATUSES,
} from './lib/projects/hold-registry.js';
export {
  validateClaimStartBody,
  validateClaimVerifyBody,
  validateClaimBindTokenBody,
  generateVerificationCode,
  validateIdentityAppealBody,
  validateReportSpamBody,
} from './lib/identity/claim.js';
export {
  TAX_SHARE_TTL_MS,
  validateTaxShareCreateBody,
  buildTaxShareRecord,
  validateTaxShareAccess,
  serializeTaxShareListItem,
} from './lib/tax/share.js';
export {
  handleDriveProvisionPost,
  type VerifyIdTokenFn as DriveVerifyIdTokenFn,
} from './routes/drive/provision/handler.js';
export {
  handleE2eFollowsGet,
  handleE2eFollowsPost,
} from './routes/e2e/follows/handler.js';
export { handleEventsPost } from './routes/events/handler.js';
export { handleLawyersGet } from './routes/lawyers/handler.js';
export { handleMapTileGet } from './routes/map-tile/handler.js';
export { handleMarketVitalsGet } from './routes/market-vitals/handler.js';
export { handleMlsSearchGet } from './routes/mls/search/handler.js';
export { handleNotificationsDeadlineAlertPost } from './routes/notifications/deadline-alert/handler.js';
export { handlePermitsGet } from './routes/permits/handler.js';
export { handlePlacesGeocodeGet } from './routes/places/geocode/handler.js';
export { handlePresenceHeartbeatPost } from './routes/presence/heartbeat/handler.js';
export { handleReportingExportPost } from './routes/reporting/export/handler.js';
export { handleReportsPeriodGet } from './routes/reports/period/handler.js';
export {
  handleVendorPortalRequestsGet,
  handleVendorPortalRequestsPut,
} from './routes/vendor-portal/requests/handler.js';
export { handleVendorsRequestPost } from './routes/vendors/request/handler.js';
export { handleWebhooksSourcingPost } from './routes/webhooks/sourcing/handler.js';
export {
  handleReilListingsGet,
  handleReilMarketStatsGet,
  handleReilCronRefreshPost,
} from './routes/reil/listings/handler.js';
export {
  handleReilProjectPropertyPost,
  handleReilProjectValuationGet,
  handleReilProjectValuationPost,
} from './routes/reil/projects/enrichment/handler.js';
export { handleReilClosingLedgerExportGet } from './routes/reil/projects/closing-ledger/handler.js';
export { handleProjectsHoldAutoAdvancePost } from './routes/projects/hold/auto-advance/handler.js';
export {
  handlePlaidExchangeV2Post,
  type PlaidExchangeV2PostDeps,
} from './routes/plaid/exchange-v2/handler.js';
export {
  DRIVE_SUB_FOLDERS,
  validateDriveProvisionBody,
  buildDriveFoldersPayload,
} from './lib/drive/provision.js';
export {
  MILESTONE_EVENTS,
  validateEventsPostBody,
  sanitizeEventProperties,
} from './lib/events/ingestion.js';
export {
  LAWYER_MAX_RESULTS,
  validateLawyerStateQuery,
  mergeLawyerQueryResults,
} from './lib/lawyers/query.js';
export {
  clampMapTileParams,
  buildGoogleStaticMapUrl,
} from './lib/map-tile/static.js';
export {
  validateMarketVitalsZip,
  buildZipDemographics,
} from './lib/market-vitals/census.js';
export {
  validateMlsSearchQuery,
  buildMlsSearchFilter,
  mapMlsPropertyResults,
} from './lib/mls/search.js';
export {
  validateDeadlineAlertBody,
  buildDeadlineTimeLabel,
} from './lib/notifications/deadline-alert.js';
export { validatePermitLookupQuery } from './lib/permits/lookup.js';
export {
  validateGeocodeQuery,
  parseGeocodeApiResponse,
} from './lib/places/geocode.js';
export {
  validateReportingExportBody,
  rowsToCsv,
  EXPORT_FORMATS,
  EXPORT_TYPES,
} from './lib/reporting/export.js';
export {
  REPORT_PERIODS,
  validateReportsPeriod,
  computePeriodStart,
  paginateReportTransactions,
  computeReportTotals,
} from './lib/reports/period.js';
export {
  validateReilListingsQuery,
  parseReilListingsParams,
  validateReilMarketStatsZip,
  shouldReturnCachedProperty,
  resolvePropertyLookupKey,
  serializeValuationSnapshots,
} from './lib/reil/listings.js';
export {
  validateVendorPortalQuoteBody,
  validateVendorRequestBody,
  enrichVendorPortalRequests,
} from './lib/vendors/portal.js';
export {
  validateSourcingWebhookAuth,
  parseSourcingOwnershipShares,
  validateSourcingWebhookBody,
} from './lib/webhooks/sourcing.js';
export {
  validateHoldAutoAdvanceBody,
  checkHoldExitGating,
  buildHoldAutoAdvanceUpdate,
  validateReilCronAuth,
} from './lib/projects/hold-auto-advance.js';
export {
  buildClosingLedgerCsv,
  buildClosingLedgerBasename,
} from './lib/reil/closing-ledger.js';
export {
  validateBridgeAddressQuery,
  mapBridgeSearchRecords,
  mapBridgeAgentResults,
  mapBridgeOfficeResults,
  mapBridgeOpenHouseResults,
  buildBridgeMetadataResponse,
  isBridgeCredentialIssue,
  isBridgeServicePaused,
  type BridgeSearchResult,
} from './lib/bridge/helpers.js';
export {
  verifyBridgeWebhookHmac,
  parseBridgeWebhookPayload,
} from './lib/webhooks/bridge-hmac.js';
export {
  validateWorkerAuthorization,
  parseWorkerBatchSize,
  WORKER_QUEUE_NAMES,
} from './lib/worker/drain.js';
export {
  validateRehabUpdateBody,
  hasCrossTenantProjectAccess,
  mergeRehabData,
} from './lib/projects/rehab.js';
export {
  validateTodosUpdateBody,
  validateTodoPermissionChanges,
  isSubscriptionActive,
} from './lib/projects/todos.js';
export {
  validateLenderPackageAccess,
  buildCustomaryChecklistNames,
  buildSeededLenderPackageItems,
  validateLenderPackageCreateBody,
  LENDER_PACKAGE_VENDOR_SLOTS,
} from './lib/projects/lender-package.js';
export {
  VALID_LOAN_INSTRUMENTS,
  normalizeSelectedInstruments,
  validateLoanInstruments,
  buildAllCashProjectUpdate,
  buildFinancedProjectUpdate,
  buildLoanRecordsForInstrument,
  buildLoanSyncPatchFromEstimate,
} from './lib/projects/loans.js';
export { healthCheckMetricsProbe } from './probes/metrics-probe.js';
export {
  jsonResponse,
  binaryResponse,
  sseResponse,
  htmlResponse,
  redirectResponse,
  type RouteResult,
  type SetCookie,
  type HttpRequestLike,
} from './http/response.js';
export { validateCsrf, type CsrfResult } from './lib/auth/csrf.js';
export { circuitBreakers } from './lib/circuit-breaker.js';
export { calculateKPIs } from './lib/insights/kpi-engine.js';
export { aggregatePortfolioData, type ReportPeriod } from './lib/reports/aggregation.js';

export const API_APP_STATUS = 'phase-4aa' as const;
