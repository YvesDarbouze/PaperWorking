export { DealsCommandValidationError } from './deals-command-errors.js';
export { DealCommunicationValidationError } from './deal-communication-errors.js';
export {
  verifyBroadcastToken,
  signBroadcastToken,
  requireBroadcastTokenSecret,
  resolveBroadcastTokenSecret,
  resolveDealReplyWebhookSecret,
  resolveDealAppBaseUrl,
  buildDealExternalReplyUrl,
  DEFAULT_BROADCAST_TOKEN_TTL_SEC,
  type BroadcastTokenPayload,
} from './broadcast-token.js';
export type {
  DealBroadcastRow,
  DealInvitationRow,
  DealMessageRow,
  DealCommunicationRepository,
} from './deal-communication-repository.js';
export type { DealRecord, DealExistsPreview, DealsReadRepository } from './deals-read-repository.js';
export type { DealCreateData, DealsCommandRepository } from './deals-command-repository.js';
export {
  DealsReadService,
  createDealsReadService,
  type DealsReadServiceDeps,
  type DealsListResult,
  type DealExistsResult,
} from './deals-read-service.js';
export {
  DealsCommandService,
  createDealsCommandService,
  type DealsCommandServiceDeps,
  type CreateDealInput,
  type DealCreateResult,
} from './deals-command-service.js';
export {
  DealBroadcastService,
  createDealBroadcastService,
  type DealBroadcastServiceDeps,
  type DealBroadcastInput,
  type DealBroadcastResult,
  type DealBroadcastRecipientLink,
} from './deal-broadcast-service.js';
export {
  DealReplyService,
  createDealReplyService,
  type DealReplyServiceDeps,
  type DealReplyInput,
  type DealReplyContext,
  type DealReplyResult,
  type DealReplyTrustMode,
} from './deal-reply-service.js';
