import type { RouteResult } from '@paperworking/api';
import { NextResponse } from 'next/server';
import { normalizeToStructuredError } from '@paperworking/shared';

const VALIDATION_FIELD_LABELS: Record<string, string> = {
  address: 'Property Address',
  property_address: 'Property Address',
  projectName: 'Project Name',
  propertyName: 'Property Name',
  purchasePrice: 'Purchase Price',
  purchase_price: 'Purchase Price',
  rehabBudget: 'Rehab Budget',
  rehab_budget: 'Rehab Budget',
  estimatedARV: 'Estimated ARV',
  grossRentMonthly: 'Monthly Gross Rent',
  operatingExpenseRatioPct: 'Operating Expense Ratio (%)',
  targetLtvPct: 'Target LTV (%)',
  interestRatePct: 'Interest Rate (%)',
  amortizationYears: 'Amortization Period (Years)',
  strategy: 'Investment Strategy',
  buyerClosingCostsPct: 'Buyer Closing Costs (%)',
  beds: 'Bedrooms',
  baths: 'Bathrooms',
  sqft: 'Square Footage',
  yearBuilt: 'Year Built',
  taxAssessment: 'Tax Assessment',
};

export function formatValidationDetailsMap(details: Record<string, unknown>): string {
  const formattedParts = Object.entries(details)
    .filter(([, msgs]) => (Array.isArray(msgs) && msgs.length > 0) || typeof msgs === 'string')
    .map(([field, msgs]) => {
      const label = VALIDATION_FIELD_LABELS[field] || field;
      const ruleText = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
      const displayField = label === field ? field : `${label} (${field})`;
      return `${displayField}: ${ruleText}`;
    });

  if (formattedParts.length === 0) {
    return 'Validation failed: please check required project fields.';
  }
  return `Validation failed: ${formattedParts.join('; ')}`;
}

export function extractValidationErrorMessage(
  errorData: unknown,
  fallback = 'Failed to create project. Please verify inputs.',
): string {
  if (!errorData || typeof errorData !== 'object') {
    return typeof errorData === 'string' && errorData.trim().length > 0 ? errorData : fallback;
  }

  const obj = errorData as Record<string, unknown>;
  if (obj.details && typeof obj.details === 'object' && !Array.isArray(obj.details)) {
    const detailed = formatValidationDetailsMap(obj.details as Record<string, unknown>);
    if (detailed !== 'Validation failed: please check required project fields.') {
      return detailed;
    }
  }

  const nestedErrorObj =
    obj.error && typeof obj.error === 'object' ? (obj.error as Record<string, unknown>) : null;
  const candidate: string =
    (typeof obj.message === 'string' && obj.message.trim().length > 0 ? obj.message.trim() : '') ||
    (typeof obj.error === 'string' && obj.error.trim().length > 0 ? obj.error.trim() : '') ||
    (nestedErrorObj &&
    typeof nestedErrorObj.message === 'string' &&
    nestedErrorObj.message.trim().length > 0
      ? nestedErrorObj.message.trim()
      : '');

  if (candidate === 'Validation failed' || candidate === 'Validation failed.') {
    return 'Validation failed: Property Address (Step 1) and Purchase Price greater than $0 (Step 2) are required.';
  }

  return candidate || fallback;
}

export function toNextResponse(result: RouteResult): NextResponse {
  const headers = new Headers(result.headers ?? {});

  if (result.cookies?.length) {
    for (const cookie of result.cookies) {
      const parts = [`${cookie.name}=${encodeURIComponent(cookie.value)}`];
      const opts = cookie.options;
      if (opts?.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
      if (opts?.path) parts.push(`Path=${opts.path}`);
      if (opts?.httpOnly) parts.push('HttpOnly');
      if (opts?.secure) parts.push('Secure');
      if (opts?.sameSite) parts.push(`SameSite=${opts.sameSite[0].toUpperCase()}${opts.sameSite.slice(1)}`);
      headers.append('Set-Cookie', parts.join('; '));
    }
  }

  // W1-09: All 4xx and 5xx API error responses conform to { error: { code, message, traceId } }
  if (result.status >= 400) {
    const traceId = headers.get('x-trace-id') || headers.get('traceparent') || undefined;
    const bodyObj =
      result.body && typeof result.body === 'object'
        ? (result.body as Record<string, unknown>)
        : {};
    const fieldDetails =
      result.status < 500 &&
      bodyObj.details &&
      typeof bodyObj.details === 'object' &&
      !Array.isArray(bodyObj.details)
        ? (bodyObj.details as Record<string, unknown>)
        : undefined;

    const structured = normalizeToStructuredError(result.body, result.status, traceId);

    if (
      fieldDetails &&
      (structured.error.message === 'Validation failed' ||
        structured.error.message === 'Validation failed.')
    ) {
      structured.error.message = formatValidationDetailsMap(fieldDetails);
    }

    headers.set('Content-Type', 'application/json');
    headers.set('X-Trace-Id', structured.error.traceId);
    return NextResponse.json(
      {
        ...structured,
        code: structured.error.code,
        message: structured.error.message,
        ...(fieldDetails ? { details: fieldDetails } : {}),
        ...(typeof bodyObj.requiredRole === 'string' ? { requiredRole: bodyObj.requiredRole } : {}),
      },
      { status: result.status, headers },
    );
  }

  if (result.body instanceof ReadableStream) {
    return new NextResponse(result.body, { status: result.status, headers });
  }

  if (result.body === null) {
    return new NextResponse(null, { status: result.status, headers });
  }

  if (typeof result.body === 'string') {
    return new NextResponse(result.body, { status: result.status, headers });
  }

  if (result.body instanceof ArrayBuffer) {
    return new NextResponse(result.body, { status: result.status, headers });
  }

  if (ArrayBuffer.isView(result.body)) {
    const arrayBuffer = result.body.buffer.slice(
      result.body.byteOffset,
      result.body.byteOffset + result.body.byteLength,
    ) as ArrayBuffer;
    return new NextResponse(arrayBuffer, { status: result.status, headers });
  }

  return NextResponse.json(result.body, { status: result.status, headers });
}
