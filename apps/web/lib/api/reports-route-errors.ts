import { AuthzForbiddenError, AuthzNotFoundError } from '@paperworking/authz';
import { ReportsGenerateValidationError } from '@paperworking/services';
import { NextResponse } from 'next/server';

/** Map authz errors from reports services to Next HTTP responses. */
export function reportsErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AuthzForbiddenError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof AuthzNotFoundError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof ReportsGenerateValidationError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: 400 },
    );
  }
  return null;
}
