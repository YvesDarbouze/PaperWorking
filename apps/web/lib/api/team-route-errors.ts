import {
  AuthzForbiddenError,
  AuthzNotFoundError,
} from '@paperworking/authz';
import {
  TeamInvalidRoleError,
  TeamMemberIdRequiredError,
  TeamMemberNotFoundError,
  TeamNoOrganizationError,
} from '@paperworking/services';
import { NextResponse } from 'next/server';

/** Map shared team command errors to Next HTTP responses (Nest parity). */
export function teamCommandErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof TeamInvalidRoleError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof TeamMemberNotFoundError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof TeamMemberIdRequiredError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof TeamNoOrganizationError) {
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

/** Nest createMember may return success:false inline (200). */
export function teamCommandResultResponse(
  result: { success: boolean; error?: string } | Record<string, unknown>,
): NextResponse {
  if ('success' in result && result.success === false) {
    return NextResponse.json(result, { status: 200 });
  }
  return NextResponse.json(result);
}
