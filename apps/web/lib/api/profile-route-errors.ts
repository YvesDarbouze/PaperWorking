import {
  AuthzForbiddenError,
  AuthzNotFoundError,
} from '@paperworking/authz';
import {
  ProfileForbiddenError,
  ProfileNotFoundError,
  ProfileValidationError,
} from '@paperworking/services';
import { NextResponse } from 'next/server';

export function profileErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ProfileValidationError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof ProfileForbiddenError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  if (error instanceof ProfileNotFoundError) {
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
