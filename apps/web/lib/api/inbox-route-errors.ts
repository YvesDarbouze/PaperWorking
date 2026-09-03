import { InboxItemNotFoundError } from '@paperworking/services';
import { NextResponse } from 'next/server';

/** Map shared inbox command errors to Next HTTP responses (Nest parity). */
export function inboxCommandErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof InboxItemNotFoundError) {
    return NextResponse.json(error.payload, { status: error.status });
  }
  return null;
}
