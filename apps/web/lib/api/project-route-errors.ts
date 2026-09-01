import {
  AuthzForbiddenError,
  AuthzNotFoundError,
} from '@paperworking/authz';
import {
  ProjectsReadValidationError,
  ProjectsCommandValidationError,
  ProjectDocumentsValidationError,
  ProjectDocumentsStorageError,
} from '@paperworking/services';
import { NextResponse } from 'next/server';

/** Map shared project read/command errors to Next HTTP responses (Nest parity). */
export function projectsReadErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ProjectsReadValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ProjectsCommandValidationError) {
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

/** Alias for POST/PATCH routes — same mapper as read routes. */
export const projectsCommandErrorResponse = projectsReadErrorResponse;

/** Map shared project document errors to Next HTTP responses. */
export function projectsDocumentErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof ProjectDocumentsValidationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ProjectDocumentsStorageError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return projectsReadErrorResponse(error);
}
