import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  expandListingsToRentPayments,
  type RentalListing,
} from '../../../lib/rent-history/payments.js';

export type VerifyRentHistoryAccessFn = (input: {
  uid: string;
  projectId: string;
}) => Promise<
  | { ok: true; address: string }
  | { ok: false; status: number; error: string }
>;

export type FetchRentalHistoryFn = (address: string) => Promise<RentalListing[]>;

export type CaptureTelemetryFn = (input: {
  uid: string;
  event: string;
  properties: Record<string, unknown>;
}) => Promise<void>;

export interface RentHistoryImportPostBody {
  projectId?: unknown;
  address?: unknown;
}

export interface RentHistoryImportPostDeps {
  requireAuth?: RequireAuthFn;
  verifyAccess?: VerifyRentHistoryAccessFn;
  fetchRentalHistory?: FetchRentalHistoryFn;
  captureTelemetry?: CaptureTelemetryFn;
}

/**
 * POST /api/rent-history/import
 */
export async function handleRentHistoryImportPost(
  body: RentHistoryImportPostBody,
  deps: RentHistoryImportPostDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    if (!projectId) {
      return jsonResponse(400, { error: 'Missing projectId parameter' });
    }

    const customAddress = typeof body.address === 'string' ? body.address : undefined;

    const access = deps.verifyAccess
      ? await deps.verifyAccess({ uid: auth.uid, projectId })
      : { ok: true as const, address: customAddress || '123 Main St' };

    if (!access.ok) {
      return jsonResponse(access.status, { error: access.error });
    }

    const address = customAddress || access.address;
    if (!address) {
      return jsonResponse(400, {
        error: 'No address associated with this project. Please provide an address.',
      });
    }

    let listings: RentalListing[] = [];
    try {
      listings = deps.fetchRentalHistory ? await deps.fetchRentalHistory(address) : [];
    } catch (apiErr: unknown) {
      const message = apiErr instanceof Error ? apiErr.message : String(apiErr);

      if (deps.captureTelemetry) {
        await deps.captureTelemetry({
          uid: auth.uid,
          event: 'rent_history_imported_failure',
          properties: { projectId, address, error: message },
        });
      }

      return jsonResponse(502, { error: 'Failed to retrieve rental history from RentCast API.' });
    }

    const rentPayments = expandListingsToRentPayments(listings);

    if (deps.captureTelemetry) {
      await deps.captureTelemetry({
        uid: auth.uid,
        event: 'rent_history_imported_success',
        properties: { projectId, address, count: rentPayments.length },
      });
    }

    return jsonResponse(200, { success: true, rentPayments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[RentCast Import] Handler error', message);
    return jsonResponse(500, { error: 'Internal server error', details: message });
  }
}
