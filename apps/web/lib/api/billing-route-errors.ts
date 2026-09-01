import {
  AuthzForbiddenError,
  AuthzNotFoundError,
} from '@paperworking/authz';
import {
  BillingForbiddenError,
  BillingNotFoundError,
  BillingUnavailableError,
  BillingValidationError,
} from '@paperworking/services';
import { NextResponse } from 'next/server';

/** Map shared billing errors to Next HTTP responses (Nest parity). */
export function billingErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof BillingValidationError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof BillingForbiddenError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof BillingNotFoundError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof BillingUnavailableError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof AuthzForbiddenError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof AuthzNotFoundError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  return null;
}
