import { AuthzForbiddenError } from '@paperworking/authz';
import { NextResponse } from 'next/server';

export function adminErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AuthzForbiddenError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  return null;
}
