import {
  AuthzForbiddenError,
  AuthzNotFoundError,
} from '@paperworking/authz';
import { DealsCommandValidationError, DealCommunicationValidationError } from '@paperworking/services';
import { NextResponse } from 'next/server';

/** Map shared deal read/command errors to Next HTTP responses (Nest parity). */
export function dealsErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof DealsCommandValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof DealCommunicationValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof AuthzForbiddenError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof AuthzNotFoundError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  return null;
}
