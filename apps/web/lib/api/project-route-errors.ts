import {
  AuthzForbiddenError,
  AuthzNotFoundError,
} from '@paperworking/authz';
import { ProjectsReadValidationError } from '@paperworking/services';
import { NextResponse } from 'next/server';

/** Map shared project read errors to Next HTTP responses (Nest parity). */
export function projectsReadErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ProjectsReadValidationError) {
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
