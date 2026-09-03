import { AuthzForbiddenError, AuthzNotFoundError } from '@paperworking/authz';
import { NextResponse } from 'next/server';

export function insightsErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AuthzForbiddenError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof AuthzNotFoundError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  return null;
}
