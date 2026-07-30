import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * /api/financial/transactions
 *
 * Unified FinancialTransaction CRUD — works with or without Plaid.
 *
 * GET  — paginated list for a project, filtered by category/direction/status
 * POST — create a manual FinancialTransaction (source=MANUAL, no Plaid required)
 *
 * Auth: Firebase ID token via Authorization: Bearer header.
 *       The acting identity is derived from the token, never from the request body.
 */

export const dynamic = 'force-dynamic';

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const category = searchParams.get('category') ?? undefined;
  const direction = searchParams.get('direction') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const source = searchParams.get('source') ?? undefined;
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50', 10)));

  // Validate direction/status/category values are not garbage
  const validDirections = ['CREDIT', 'DEBIT'];
  const validStatuses = ['PENDING_REVIEW', 'AUTO_APPROVED', 'MANUALLY_APPROVED', 'EXCLUDED', 'DUPLICATE'];
  const validSources = ['MANUAL', 'PLAID_TRANSACTIONS', 'PLAID_LIABILITIES', 'IMPORTED_CSV'];

  const where: Prisma.FinancialTransactionWhereInput = {
    userId: uid,
    ...(projectId ? { projectId } : {}),
    ...(category ? { category: category as any } : {}),
    ...(direction && validDirections.includes(direction) ? { direction: direction as any } : {}),
    ...(status && validStatuses.includes(status) ? { status: status as any } : {}),
    ...(source && validSources.includes(source) ? { source: source as any } : {}),
    ...(startDate || endDate
      ? {
          transactionDate: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        }
      : {}),
  };

  try {
    const [transactions, total] = await Promise.all([
      prisma.financialTransaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.financialTransaction.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      transactions: transactions.map((t) => ({
        ...t,
        // Serialize Decimal fields for JSON
        amount: t.amount.toString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: any) {
    console.error('[FinancialTransactions GET] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const { uid } = auth;

  let body: {
    projectId?: string;
    amount?: number;         // in dollars (e.g. 2500.00)
    direction?: string;      // 'CREDIT' | 'DEBIT'
    transactionDate?: string; // ISO date
    payee?: string;
    description?: string;
    category?: string;       // FinancialTransactionCategory
    taxTreatment?: string;   // FinancialTaxTreatment
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { projectId, amount, direction, transactionDate, payee, description, category } = body;

  // Validate required fields
  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
  }
  if (amount == null || isNaN(amount) || amount <= 0) {
    return NextResponse.json({ success: false, error: 'amount must be a positive number (in dollars)' }, { status: 400 });
  }
  if (!direction || !['CREDIT', 'DEBIT'].includes(direction)) {
    return NextResponse.json({ success: false, error: 'direction must be CREDIT or DEBIT' }, { status: 400 });
  }
  if (!transactionDate) {
    return NextResponse.json({ success: false, error: 'transactionDate is required (ISO date)' }, { status: 400 });
  }

  // Verify the project belongs to the authenticated user (anti-IDOR)
  const project = await prisma.reilProject.findFirst({
    where: { id: projectId, createdById: uid },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ success: false, error: 'Project not found or access denied' }, { status: 403 });
  }

  try {
    const tx = await prisma.financialTransaction.create({
      data: {
        projectId,
        userId: uid,
        source: 'MANUAL',
        amount: new Prisma.Decimal(amount.toFixed(2)),
        direction: direction as any,
        transactionDate: new Date(transactionDate),
        postedDate: new Date(transactionDate),
        payee: payee ?? payee ?? 'Manual Entry',
        description: description ?? null,
        category: (category ?? 'UNCATEGORIZED') as any,
        ...(body.taxTreatment ? { taxTreatment: body.taxTreatment as any } : {}),
        notes: body.notes ?? null,
        status: 'MANUALLY_APPROVED',
        confidenceScore: 1.0,
      },
    });

    // PostHog telemetry
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (posthogKey) {
      fetch('https://app.posthog.com/capture/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: posthogKey,
          event: 'financial_transaction_manual_created',
          distinct_id: uid,
          properties: {
            transactionId: tx.id,
            projectId,
            category: tx.category,
            direction,
            amount,
          },
        }),
      }).catch(() => {/* ignore */});
    }

    return NextResponse.json({
      success: true,
      transaction: {
        ...tx,
        amount: tx.amount.toString(),
      },
    });
  } catch (err: any) {
    console.error('[FinancialTransactions POST] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
