import {
  AuthzForbiddenError,
  AuthzNotFoundError,
} from '@paperworking/authz';
import {
  MarketplaceFollowCommandValidationError,
  VendorPortalCommandValidationError,
} from '@paperworking/services';
import { NextResponse } from 'next/server';

/** Map shared marketplace/vendor read errors to Next HTTP responses. */
export function marketplaceVendorReadErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AuthzForbiddenError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof AuthzNotFoundError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  return null;
}

/** Map shared marketplace/vendor mutation errors to Next HTTP responses (Nest parity). */
export function marketplaceVendorCommandErrorResponse(error: unknown): NextResponse | null {
  const readMapped = marketplaceVendorReadErrorResponse(error);
  if (readMapped) return readMapped;
  if (error instanceof MarketplaceFollowCommandValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof VendorPortalCommandValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}
