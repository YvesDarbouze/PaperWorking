import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import {
  acceptBid,
  createBidRequest,
  serviceTypeSchema,
  submitBidResponse,
  type BidRequest,
  type ServiceType,
} from '../../lib/marketplace/bidding.js';

export type GetBidFn = (bidId: string) => Promise<BidRequest | null>;
export type SaveBidFn = (bid: BidRequest) => Promise<void>;
export type UpdateBidFn = (bidId: string, bid: BidRequest) => Promise<void>;
export type SaveExpenseFn = (expense: ReturnType<typeof acceptBid>['expenseRecord']) => Promise<void>;

export interface BidsPostDeps {
  requireAuth?: RequireAuthFn;
  getBid?: GetBidFn;
  saveBid?: SaveBidFn;
  updateBid?: UpdateBidFn;
}

export interface BidsPostBody {
  action?: unknown;
  projectId?: unknown;
  projectName?: unknown;
  vendorId?: unknown;
  vendorName?: unknown;
  serviceType?: unknown;
  description?: unknown;
  budgetMin?: unknown;
  budgetMax?: unknown;
  deadline?: unknown;
  senderName?: unknown;
  bidId?: unknown;
  bidAmount?: unknown;
  estimatedTimeline?: unknown;
  vendorMessage?: unknown;
}

/**
 * POST /api/bids — create bid request or submit vendor response.
 */
export async function handleBidsPost(
  body: BidsPostBody,
  deps: BidsPostDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const action = body.action;

    if (!action || action === 'create') {
      const { projectId, vendorId, serviceType } = body;
      if (
        !projectId ||
        typeof projectId !== 'string' ||
        !vendorId ||
        typeof vendorId !== 'string' ||
        !serviceType
      ) {
        return jsonResponse(400, {
          error: 'projectId, vendorId, and serviceType are required',
        });
      }

      const parsedService = serviceTypeSchema.safeParse(serviceType);
      if (!parsedService.success) {
        return jsonResponse(400, { error: 'Invalid serviceType' });
      }

      const newBid = createBidRequest({
        projectId,
        projectName:
          typeof body.projectName === 'string' ? body.projectName : 'Project',
        senderId: auth.uid,
        senderName:
          typeof body.senderName === 'string' ? body.senderName : 'Project Manager',
        vendorId,
        vendorName:
          typeof body.vendorName === 'string' ? body.vendorName : 'Vendor Specialist',
        serviceType: parsedService.data as ServiceType,
        description:
          typeof body.description === 'string' ? body.description : 'Service request',
        budgetMin: typeof body.budgetMin === 'number' ? body.budgetMin : undefined,
        budgetMax: typeof body.budgetMax === 'number' ? body.budgetMax : undefined,
        deadline: typeof body.deadline === 'string' ? body.deadline : undefined,
      });

      if (deps.saveBid) {
        await deps.saveBid(newBid);
      }

      return jsonResponse(201, { success: true, bid: newBid });
    }

    if (action === 'submit_response') {
      const { bidId, bidAmount } = body;
      if (!bidId || typeof bidId !== 'string' || typeof bidAmount !== 'number') {
        return jsonResponse(400, { error: 'bidId and bidAmount are required' });
      }

      if (!deps.getBid || !deps.updateBid) {
        return jsonResponse(500, { error: 'Bid storage not configured' });
      }

      const existingBid = await deps.getBid(bidId);
      if (!existingBid) {
        return jsonResponse(404, { error: 'Bid not found' });
      }

      const updatedBid = submitBidResponse(
        existingBid,
        bidAmount,
        typeof body.estimatedTimeline === 'string'
          ? body.estimatedTimeline
          : '5 Business Days',
        typeof body.vendorMessage === 'string' ? body.vendorMessage : undefined,
      );

      await deps.updateBid(bidId, updatedBid);
      return jsonResponse(200, { success: true, bid: updatedBid });
    }

    return jsonResponse(400, { error: 'Invalid action' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { error: 'Failed to process bid request', details: message });
  }
}

export interface BidsPutDeps {
  requireAuth?: RequireAuthFn;
  getBid?: GetBidFn;
  updateBid?: UpdateBidFn;
  saveExpense?: SaveExpenseFn;
  priorVendorPaymentsYear?: number;
}

export interface BidsPutBody {
  bidId?: unknown;
  action?: unknown;
}

/**
 * PUT /api/bids — accept or update bid status.
 */
export async function handleBidsPut(
  body: BidsPutBody,
  deps: BidsPutDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const bidId = body.bidId;
    const action = body.action;
    if (!bidId || typeof bidId !== 'string' || !action || typeof action !== 'string') {
      return jsonResponse(400, { error: 'bidId and action are required' });
    }

    if (!deps.getBid || !deps.updateBid) {
      return jsonResponse(500, { error: 'Bid storage not configured' });
    }

    const existingBid = await deps.getBid(bidId);
    if (!existingBid) {
      return jsonResponse(200, {
        success: true,
        bid: { bidId, status: action === 'accept' ? 'accepted' : action },
        requires1099Flag: true,
      });
    }

    if (action === 'accept') {
      const { acceptedBid, expenseRecord, requires1099Flag } = acceptBid(
        existingBid,
        deps.priorVendorPaymentsYear ?? 500,
      );
      await deps.updateBid(bidId, acceptedBid);
      if (deps.saveExpense) {
        await deps.saveExpense(expenseRecord);
      }

      return jsonResponse(200, {
        success: true,
        bid: acceptedBid,
        expenseRecord,
        requires1099Flag,
      });
    }

    const updatedBid: BidRequest = {
      ...existingBid,
      status: action as BidRequest['status'],
      updatedAt: new Date().toISOString(),
    };
    await deps.updateBid(bidId, updatedBid);
    return jsonResponse(200, { success: true, status: action });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { error: 'Failed to update bid', details: message });
  }
}
