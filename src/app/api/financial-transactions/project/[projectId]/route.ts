import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { prisma } from '@/lib/prisma';
import { FinancialTransactionCategory, FinancialTransactionStatus, Prisma } from '@prisma/client';

/**
 * GET /api/financial-transactions/:projectId
 *
 * Lists financial transactions for a given project with filtering options.
 *
 * Query params:
 *   status? = PENDING_REVIEW | AUTO_APPROVED | MANUALLY_APPROVED | ALL
 *   tab?    = ALL | REVENUE | EXPENSE | LIABILITY | TRANSFER
 *   search? = string
 *
 * Auth: Firebase ID token via Authorization: Bearer header
 */
export const dynamic = 'force-dynamic';

const REVENUE_CATEGORIES: FinancialTransactionCategory[] = [
  'RENT_INCOME',
  'LATE_FEE_INCOME',
  'PET_RENT_INCOME',
  'PARKING_INCOME',
  'LAUNDRY_VENDING_INCOME',
  'APPLICATION_FEE_INCOME',
  'LEASE_TERMINATION_FEE',
  'UTILITY_REIMBURSEMENT',
  'INSURANCE_CLAIM_INCOME',
  'INTEREST_INCOME',
  'MISC_INCOME',
];

const EXPENSE_CATEGORIES: FinancialTransactionCategory[] = [
  'PROPERTY_TAX',
  'PROPERTY_INSURANCE',
  'HOA_FEES',
  'MANAGEMENT_FEES',
  'LEASING_FEES',
  'MAINTENANCE_REPAIR',
  'UTILITIES',
  'LANDSCAPING_SNOW',
  'PEST_CONTROL',
  'CLEANING_TURNOVER',
  'MARKETING_ADVERTISING',
  'LEGAL_PROFESSIONAL',
  'ACCOUNTING_BOOKKEEPING',
  'TRAVEL_MILEAGE',
  'BANK_CREDIT_CARD_FEES',
  'SOFTWARE_TECHNOLOGY',
  'LICENSES_PERMITS',
  'TURNOVER_COSTS',
  'SUPPLIES',
  'MISC_EXPENSE',
  'CAPITAL_EXPENDITURE',
];

const LIABILITY_CATEGORIES: FinancialTransactionCategory[] = [
  'MORTGAGE_PRINCIPAL',
  'MORTGAGE_INTEREST',
  'MORTGAGE_ESCROW_PAYMENT',
];

const TRANSFER_CATEGORIES: FinancialTransactionCategory[] = [
  'SECURITY_DEPOSIT_RECEIVED',
  'SECURITY_DEPOSIT_RETURNED',
  'OWNER_DISTRIBUTION',
  'CAPITAL_CONTRIBUTION',
  'RESERVE_TRANSFER',
  'INTER_ACCOUNT_TRANSFER',
];

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { projectId } = params;
  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get('status') || 'PENDING_REVIEW';
  const tabParam = (searchParams.get('tab') || 'ALL').toUpperCase();
  const searchQuery = searchParams.get('search')?.trim().toLowerCase();

  try {
    const whereClause: Prisma.FinancialTransactionWhereInput = {
      projectId,
    };

    // Filter by status
    if (statusParam !== 'ALL') {
      whereClause.status = statusParam as FinancialTransactionStatus;
    }

    // Filter by tab
    if (tabParam === 'REVENUE') {
      whereClause.category = { in: REVENUE_CATEGORIES };
    } else if (tabParam === 'EXPENSE') {
      whereClause.category = { in: EXPENSE_CATEGORIES };
    } else if (tabParam === 'LIABILITY') {
      whereClause.category = { in: LIABILITY_CATEGORIES };
    } else if (tabParam === 'TRANSFER') {
      whereClause.category = { in: TRANSFER_CATEGORIES };
    }

    // Search query filter
    if (searchQuery) {
      whereClause.OR = [
        { payee: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const transactions = await prisma.financialTransaction.findMany({
      where: whereClause,
      include: {
        plaidTransaction: true,
      },
      orderBy: { transactionDate: 'desc' },
    });

    const formatted = transactions.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      source: t.source,
      plaidTransactionId: t.plaidTransactionId,
      amount: Number(t.amount),
      direction: t.direction,
      transactionDate: t.transactionDate.toISOString(),
      postedDate: t.postedDate?.toISOString() ?? null,
      payee: t.payee,
      description: t.description,
      category: t.category,
      subCategory: t.subCategory,
      matchedLeaseId: t.matchedLeaseId,
      status: t.status,
      confidenceScore: t.confidenceScore,
      isRecurring: t.isRecurring,
      isSplit: t.isSplit,
      notes: t.notes,
      plaidPersonalFinanceCategory: t.plaidTransaction?.personalFinanceCategory ?? null,
    }));

    return NextResponse.json({
      success: true,
      projectId,
      count: formatted.length,
      transactions: formatted,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[GET /api/financial-transactions/${projectId}] Failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
