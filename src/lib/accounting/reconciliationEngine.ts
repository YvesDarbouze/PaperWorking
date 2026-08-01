import prisma from '@/lib/prisma';
import { sseEventBus } from '@/lib/events/eventBus';
import {
  ReconciliationStatus,
  ReconciliationItemType,
  ReconciliationItemStatus,
  FinancialTransactionCategory,
  FinancialTransactionDirection,
  FinancialTransactionStatus,
  FinancialTransactionSource,
  PlaidConnectionStatus,
} from '@prisma/client';

export interface ReconciliationReport {
  periodId: string;
  projectId: string;
  projectName: string;
  address: string;
  month: number;
  year: number;
  status: ReconciliationStatus;
  bankStatementBalance: number;
  paperWorkingBalance: number;
  difference: number;
  reconciledAt: Date | null;
  reconciledBy: string | null;
  reconcilerName?: string | null;
  notes: string | null;
  summary: {
    totalItems: number;
    matchedCount: number;
    verifiedCount: number;
    adjustedCount: number;
    ignoredCount: number;
    pendingCount: number;
    bankOnlyCount: number;
    paperWorkingOnlyCount: number;
    discrepancyCount: number;
  };
  items: Array<{
    id: string;
    itemType: ReconciliationItemType;
    status: ReconciliationItemStatus;
    description: string;
    date: Date;
    bankAmount: number | null;
    paperWorkingAmount: number | null;
    difference: number;
    notes: string | null;
    financialTransactionId: string | null;
    plaidTransactionId: string | null;
  }>;
}

export class BankReconciliationEngine {
  /**
   * Starts or fetches a reconciliation period for a project and month/year.
   */
  static async startReconciliation(
    projectId: string,
    month: number,
    year: number,
    userId: string,
    bankStatementBalance?: number
  ) {
    // 1. Check existing period
    const existing = await prisma.reconciliationPeriod.findUnique({
      where: {
        projectId_month_year: { projectId, month, year },
      },
      include: {
        items: {
          include: {
            financialTransaction: true,
            plaidTransaction: true,
          },
          orderBy: { date: 'asc' },
        },
        project: true,
      },
    });

    if (existing) {
      if (existing.status === ReconciliationStatus.RECONCILED) {
        throw new Error('Already reconciled');
      }
      // Update bank statement balance if provided
      if (bankStatementBalance !== undefined) {
        const stmtBal = bankStatementBalance;
        const pwBal = Number(existing.paperWorkingBalance);
        const diff = Number((stmtBal - pwBal).toFixed(2));

        const updated = await prisma.reconciliationPeriod.update({
          where: { id: existing.id },
          data: {
            bankStatementBalance: stmtBal,
            difference: diff,
            status: existing.status === ReconciliationStatus.OPEN ? ReconciliationStatus.IN_PROGRESS : existing.status,
          },
          include: {
            items: {
              include: {
                financialTransaction: true,
                plaidTransaction: true,
              },
              orderBy: { date: 'asc' },
            },
            project: true,
          },
        });
        return updated;
      }
      return existing;
    }

    // 2. Compute date bounds for target month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 3. Fetch APPROVED PaperWorking FinancialTransactions for target month
    const paperWorkingTxs = await prisma.financialTransaction.findMany({
      where: {
        projectId,
        status: {
          in: [FinancialTransactionStatus.AUTO_APPROVED, FinancialTransactionStatus.MANUALLY_APPROVED],
        },
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { transactionDate: 'asc' },
    });

    // 4. Fetch Plaid raw transactions for connected accounts on this project
    const plaidConn = await prisma.plaidConnection.findFirst({
      where: { projectId, status: PlaidConnectionStatus.ACTIVE },
    });

    const plaidRawTxs = plaidConn
      ? await prisma.plaidRawTransaction.findMany({
          where: {
            plaidConnectionId: plaidConn.id,
            postedDate: {
              gte: startDate,
              lte: endDate,
            },
            removed: false,
          },
          orderBy: { postedDate: 'asc' },
        })
      : [];

    // 5. Match items
    const { itemsToCreate, paperWorkingBalance } = this.runMatchingAlgorithm({
      paperWorkingTxs,
      plaidRawTxs,
    });

    const initialBankBal = bankStatementBalance ?? 0;
    const initialDiff = Number((initialBankBal - paperWorkingBalance).toFixed(2));

    // 6. Create period and items in DB
    const createdPeriod = await prisma.reconciliationPeriod.create({
      data: {
        projectId,
        plaidConnectionId: plaidConn?.id || null,
        month,
        year,
        status: ReconciliationStatus.OPEN,
        bankStatementBalance: initialBankBal,
        paperWorkingBalance: paperWorkingBalance,
        difference: initialDiff,
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        items: {
          include: {
            financialTransaction: true,
            plaidTransaction: true,
          },
          orderBy: { date: 'asc' },
        },
        project: true,
      },
    });

    return createdPeriod;
  }

  /**
   * Internal pure matching algorithm helper.
   */
  static runMatchingAlgorithm(params: {
    paperWorkingTxs: any[];
    plaidRawTxs: any[];
  }) {
    const { paperWorkingTxs, plaidRawTxs } = params;

    const matchedPwIds = new Set<string>();
    const matchedPlaidIds = new Set<string>();

    const itemsToCreate: Array<{
      financialTransactionId?: string | null;
      plaidTransactionId?: string | null;
      itemType: ReconciliationItemType;
      bankAmount?: number | null;
      paperWorkingAmount?: number | null;
      description: string;
      date: Date;
      status: ReconciliationItemStatus;
    }> = [];

    let paperWorkingBalance = 0;
    paperWorkingTxs.forEach((tx) => {
      const amt = Number(tx.amount);
      const sign = tx.direction === 'CREDIT' ? 1 : -1;
      paperWorkingBalance += amt * sign;
    });
    paperWorkingBalance = Number(paperWorkingBalance.toFixed(2));

    // Pass 1: Exact matches (same amount sign/val, date within 1.5 days)
    for (const pw of paperWorkingTxs) {
      if (matchedPwIds.has(pw.id)) continue;
      const pwAmt = Number(pw.amount) * (pw.direction === 'CREDIT' ? 1 : -1);
      const pwDate = new Date(pw.transactionDate).getTime();

      for (const pl of plaidRawTxs) {
        if (matchedPlaidIds.has(pl.id)) continue;
        const plAmt = Number(pl.amount) * (pl.direction === 'CREDIT' ? 1 : -1);
        const plDate = new Date(pl.postedDate || pl.authorizedDate || pl.createdAt).getTime();

        const amtDiff = Math.abs(pwAmt - plAmt);
        const dayDiff = Math.abs(pwDate - plDate) / (1000 * 60 * 60 * 24);

        if (amtDiff <= 0.01 && dayDiff <= 1.5) {
          matchedPwIds.add(pw.id);
          matchedPlaidIds.add(pl.id);
          itemsToCreate.push({
            financialTransactionId: pw.id,
            plaidTransactionId: pl.id,
            itemType: ReconciliationItemType.MATCHED,
            bankAmount: plAmt,
            paperWorkingAmount: pwAmt,
            description: pw.payee || pl.name || 'Matched Transaction',
            date: pw.transactionDate,
            status: ReconciliationItemStatus.VERIFIED,
          });
          break;
        }
      }
    }

    // Pass 2: Partial matches (same amount within 3.5 days)
    for (const pw of paperWorkingTxs) {
      if (matchedPwIds.has(pw.id)) continue;
      const pwAmt = Number(pw.amount) * (pw.direction === 'CREDIT' ? 1 : -1);
      const pwDate = new Date(pw.transactionDate).getTime();

      for (const pl of plaidRawTxs) {
        if (matchedPlaidIds.has(pl.id)) continue;
        const plAmt = Number(pl.amount) * (pl.direction === 'CREDIT' ? 1 : -1);
        const plDate = new Date(pl.postedDate || pl.authorizedDate || pl.createdAt).getTime();

        const amtDiff = Math.abs(pwAmt - plAmt);
        const dayDiff = Math.abs(pwDate - plDate) / (1000 * 60 * 60 * 24);

        if (amtDiff <= 0.01 && dayDiff <= 3.5) {
          matchedPwIds.add(pw.id);
          matchedPlaidIds.add(pl.id);
          itemsToCreate.push({
            financialTransactionId: pw.id,
            plaidTransactionId: pl.id,
            itemType: ReconciliationItemType.MATCHED,
            bankAmount: plAmt,
            paperWorkingAmount: pwAmt,
            description: pw.payee || pl.name || 'Matched Transaction',
            date: pw.transactionDate,
            status: ReconciliationItemStatus.PENDING,
          });
          break;
        }
      }
    }

    // Pass 3: Remaining PaperWorking transactions -> PAPERWORKING_ONLY
    for (const pw of paperWorkingTxs) {
      if (!matchedPwIds.has(pw.id)) {
        const pwAmt = Number(pw.amount) * (pw.direction === 'CREDIT' ? 1 : -1);
        itemsToCreate.push({
          financialTransactionId: pw.id,
          itemType: ReconciliationItemType.PAPERWORKING_ONLY,
          bankAmount: null,
          paperWorkingAmount: pwAmt,
          description: pw.payee || pw.description || 'PaperWorking Entry',
          date: pw.transactionDate,
          status: ReconciliationItemStatus.PENDING,
        });
      }
    }

    // Pass 4: Remaining Plaid transactions -> BANK_ONLY
    for (const pl of plaidRawTxs) {
      if (!matchedPlaidIds.has(pl.id)) {
        const plAmt = Number(pl.amount) * (pl.direction === 'CREDIT' ? 1 : -1);
        itemsToCreate.push({
          plaidTransactionId: pl.id,
          itemType: ReconciliationItemType.BANK_ONLY,
          bankAmount: plAmt,
          paperWorkingAmount: null,
          description: pl.merchantName || pl.name || 'Bank Statement Entry',
          date: pl.postedDate || pl.authorizedDate || pl.createdAt,
          status: ReconciliationItemStatus.PENDING,
        });
      }
    }

    return { itemsToCreate, paperWorkingBalance };
  }

  /**
   * Re-runs matching algorithm with relaxed parameters for unmatched items.
   */
  static async matchItems(reconciliationPeriodId: string) {
    const period = await prisma.reconciliationPeriod.findUnique({
      where: { id: reconciliationPeriodId },
      include: { items: true },
    });

    if (!period) throw new Error('Reconciliation period not found');
    if (period.status === ReconciliationStatus.RECONCILED) {
      throw new Error('Cannot match items on a reconciled period');
    }

    const bankOnlyItems = period.items.filter((i) => i.itemType === ReconciliationItemType.BANK_ONLY);
    const pwOnlyItems = period.items.filter((i) => i.itemType === ReconciliationItemType.PAPERWORKING_ONLY);

    for (const bItem of bankOnlyItems) {
      const bAmt = Number(bItem.bankAmount ?? 0);
      const bTime = new Date(bItem.date).getTime();

      for (const pItem of pwOnlyItems) {
        if (pItem.status === ReconciliationItemStatus.IGNORED) continue;

        const pAmt = Number(pItem.paperWorkingAmount ?? 0);
        const pTime = new Date(pItem.date).getTime();

        const amtDiff = Math.abs(bAmt - pAmt);
        const dayDiff = Math.abs(bTime - pTime) / (1000 * 60 * 60 * 24);

        // Relaxed match: amount within $0.05 AND within 7 days
        if (amtDiff <= 0.05 && dayDiff <= 7) {
          await prisma.reconciliationItem.update({
            where: { id: bItem.id },
            data: {
              financialTransactionId: pItem.financialTransactionId,
              itemType: amtDiff <= 0.01 ? ReconciliationItemType.MATCHED : ReconciliationItemType.DISCREPANCY,
              paperWorkingAmount: pAmt,
              status: ReconciliationItemStatus.VERIFIED,
              notes: 'Auto-paired by relaxed match algorithm',
            },
          });

          // Delete duplicate PW_ONLY item
          await prisma.reconciliationItem.delete({
            where: { id: pItem.id },
          });
          break;
        }
      }
    }

    return this.recalculatePeriod(reconciliationPeriodId);
  }

  /**
   * Marks a single reconciliation item as VERIFIED.
   */
  static async verifyItem(reconciliationItemId: string, userId: string, notes?: string) {
    const item = await prisma.reconciliationItem.findUnique({
      where: { id: reconciliationItemId },
    });
    if (!item) throw new Error('Reconciliation item not found');

    let itemType = item.itemType;
    if (item.bankAmount !== null && item.paperWorkingAmount !== null) {
      const diff = Math.abs(Number(item.bankAmount) - Number(item.paperWorkingAmount));
      if (diff <= 0.01) {
        itemType = ReconciliationItemType.MATCHED;
      }
    }

    await prisma.reconciliationItem.update({
      where: { id: reconciliationItemId },
      data: {
        status: ReconciliationItemStatus.VERIFIED,
        itemType,
        notes: notes ? `${item.notes ? item.notes + ' | ' : ''}${notes}` : item.notes,
      },
    });

    return this.recalculatePeriod(item.reconciliationPeriodId);
  }

  /**
   * Adjusts a reconciliation item.
   */
  static async adjustItem(
    reconciliationItemId: string,
    adjustment: { amount?: number; category?: string; notes?: string }
  ) {
    const item = await prisma.reconciliationItem.findUnique({
      where: { id: reconciliationItemId },
      include: { reconciliationPeriod: true },
    });
    if (!item) throw new Error('Reconciliation item not found');

    const period = item.reconciliationPeriod;

    if (item.itemType === ReconciliationItemType.BANK_ONLY) {
      const adjAmt = adjustment.amount ?? Number(item.bankAmount ?? 0);
      const direction = adjAmt >= 0 ? FinancialTransactionDirection.CREDIT : FinancialTransactionDirection.DEBIT;
      const absAmt = Math.abs(adjAmt);

      const category = (adjustment.category as FinancialTransactionCategory) || 
        (direction === FinancialTransactionDirection.CREDIT ? 'MISC_INCOME' : 'MAINTENANCE_REPAIR');

      const createdTx = await prisma.financialTransaction.create({
        data: {
          projectId: period.projectId,
          userId: period.reconciledBy || 'system',
          source: FinancialTransactionSource.RECONCILIATION_ADJUSTMENT,
          amount: absAmt,
          direction,
          transactionDate: item.date,
          payee: item.description,
          category,
          status: FinancialTransactionStatus.MANUALLY_APPROVED,
          notes: adjustment.notes || `Reconciliation adjustment for bank item ${item.id}`,
        },
      });

      await prisma.reconciliationItem.update({
        where: { id: reconciliationItemId },
        data: {
          financialTransactionId: createdTx.id,
          paperWorkingAmount: adjAmt,
          itemType: ReconciliationItemType.MATCHED,
          status: ReconciliationItemStatus.ADJUSTED,
          notes: adjustment.notes || 'Created missing transaction from bank statement',
        },
      });
    } else if (item.itemType === ReconciliationItemType.PAPERWORKING_ONLY) {
      await prisma.reconciliationItem.update({
        where: { id: reconciliationItemId },
        data: {
          status: ReconciliationItemStatus.IGNORED,
          notes: adjustment.notes || 'Not on bank statement — marked as ignored',
        },
      });
    } else if (item.itemType === ReconciliationItemType.DISCREPANCY) {
      await prisma.reconciliationItem.update({
        where: { id: reconciliationItemId },
        data: {
          status: ReconciliationItemStatus.ADJUSTED,
          notes: adjustment.notes || 'Discrepancy resolved by manual adjustment',
        },
      });
    }

    return this.recalculatePeriod(period.id);
  }

  /**
   * Finalizes the reconciliation period.
   */
  static async finalizeReconciliation(reconciliationPeriodId: string, userId: string, notes?: string) {
    const period = await prisma.reconciliationPeriod.findUnique({
      where: { id: reconciliationPeriodId },
      include: {
        items: true,
        project: true,
      },
    });

    if (!period) throw new Error('Reconciliation period not found');

    // 1. Verify unreviewed items
    const unreviewed = period.items.filter((i) => i.status === ReconciliationItemStatus.PENDING);
    if (unreviewed.length > 0) {
      throw new Error(`Cannot finalize: ${unreviewed.length} item(s) are still pending review`);
    }

    // 2. Recalculate difference
    const updatedPeriod = await this.recalculatePeriod(reconciliationPeriodId);

    const diff = Math.abs(Number(updatedPeriod.difference));
    let finalStatus: ReconciliationStatus = ReconciliationStatus.RECONCILED;

    if (diff > 0.01) {
      if (!notes) {
        throw new Error('Discrepancy found. Notes/explanation required to finalize.');
      }
      finalStatus = ReconciliationStatus.DISCREPANCY_FOUND;
    }

    const finalized = await prisma.reconciliationPeriod.update({
      where: { id: reconciliationPeriodId },
      data: {
        status: finalStatus,
        reconciledAt: new Date(),
        reconciledBy: userId,
        notes: notes ? `${period.notes ? period.notes + ' | ' : ''}${notes}` : period.notes,
      },
      include: {
        items: {
          include: {
            financialTransaction: true,
            plaidTransaction: true,
          },
          orderBy: { date: 'asc' },
        },
        project: true,
        reconciler: true,
      },
    });

    // 6. Emit event
    const reconciliationEventKey = `reconciliation:completed:${finalized.projectId}` as `reconciliation:completed:${string}`;
    sseEventBus.emit(reconciliationEventKey, {
      periodId: finalized.id,
      status: finalized.status,
      timestamp: new Date().toISOString(),
    });

    return finalized;
  }

  /**
   * Recalculates paperWorkingBalance and difference for a period.
   */
  static async recalculatePeriod(periodId: string) {
    const period = await prisma.reconciliationPeriod.findUnique({
      where: { id: periodId },
      include: { items: true },
    });

    if (!period) throw new Error('Period not found');

    let pwBalance = 0;
    period.items.forEach((item) => {
      if (item.status === ReconciliationItemStatus.IGNORED) return;
      if (item.paperWorkingAmount !== null) {
        pwBalance += Number(item.paperWorkingAmount);
      }
    });
    pwBalance = Number(pwBalance.toFixed(2));

    const stmtBalance = Number(period.bankStatementBalance);
    const diff = Number((stmtBalance - pwBalance).toFixed(2));

    return prisma.reconciliationPeriod.update({
      where: { id: periodId },
      data: {
        paperWorkingBalance: pwBalance,
        difference: diff,
      },
      include: {
        items: {
          include: {
            financialTransaction: true,
            plaidTransaction: true,
          },
          orderBy: { date: 'asc' },
        },
        project: true,
      },
    });
  }

  /**
   * Generates a detailed reconciliation report object or HTML representation.
   */
  static async generateReconciliationReport(reconciliationPeriodId: string): Promise<ReconciliationReport> {
    const period = await prisma.reconciliationPeriod.findUnique({
      where: { id: reconciliationPeriodId },
      include: {
        items: {
          orderBy: { date: 'asc' },
        },
        project: true,
        reconciler: true,
      },
    });

    if (!period) throw new Error('Reconciliation period not found');

    const totalItems = period.items.length;
    const matchedCount = period.items.filter((i) => i.itemType === ReconciliationItemType.MATCHED).length;
    const verifiedCount = period.items.filter((i) => i.status === ReconciliationItemStatus.VERIFIED).length;
    const adjustedCount = period.items.filter((i) => i.status === ReconciliationItemStatus.ADJUSTED).length;
    const ignoredCount = period.items.filter((i) => i.status === ReconciliationItemStatus.IGNORED).length;
    const pendingCount = period.items.filter((i) => i.status === ReconciliationItemStatus.PENDING).length;
    const bankOnlyCount = period.items.filter((i) => i.itemType === ReconciliationItemType.BANK_ONLY).length;
    const paperWorkingOnlyCount = period.items.filter((i) => i.itemType === ReconciliationItemType.PAPERWORKING_ONLY).length;
    const discrepancyCount = period.items.filter((i) => i.itemType === ReconciliationItemType.DISCREPANCY).length;

    const reportItems = period.items.map((item) => {
      const bAmt = item.bankAmount !== null ? Number(item.bankAmount) : null;
      const pwAmt = item.paperWorkingAmount !== null ? Number(item.paperWorkingAmount) : null;
      const diff = Number(((bAmt ?? 0) - (pwAmt ?? 0)).toFixed(2));

      return {
        id: item.id,
        itemType: item.itemType,
        status: item.status,
        description: item.description,
        date: item.date,
        bankAmount: bAmt,
        paperWorkingAmount: pwAmt,
        difference: diff,
        notes: item.notes,
        financialTransactionId: item.financialTransactionId,
        plaidTransactionId: item.plaidTransactionId,
      };
    });

    return {
      periodId: period.id,
      projectId: period.projectId,
      projectName: period.project?.displayName || period.project?.addressLine || 'Investment Property',
      address: `${period.project?.addressLine || ''}, ${period.project?.city || ''} ${period.project?.state || ''}`.trim(),
      month: period.month,
      year: period.year,
      status: period.status,
      bankStatementBalance: Number(period.bankStatementBalance),
      paperWorkingBalance: Number(period.paperWorkingBalance),
      difference: Number(period.difference),
      reconciledAt: period.reconciledAt,
      reconciledBy: period.reconciledBy,
      reconcilerName: period.reconciler?.name || null,
      notes: period.notes,
      summary: {
        totalItems,
        matchedCount,
        verifiedCount,
        adjustedCount,
        ignoredCount,
        pendingCount,
        bankOnlyCount,
        paperWorkingOnlyCount,
        discrepancyCount,
      },
      items: reportItems,
    };
  }

  /**
   * Helper to format report as a printable HTML document (with CPA signature block).
   */
  static renderReportHTML(report: ReconciliationReport): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthLabel = `${monthNames[report.month - 1]} ${report.year}`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bank Reconciliation Report — ${report.projectName} (${monthLabel})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; background: #fff; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: 800; color: #0f172a; }
    .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
    .card-val { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 6px; }
    .card-lbl { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 12px; color: #475569; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
    td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .badge-matched { background: #dcfce7; color: #166534; }
    .badge-adjusted { background: #e0f2fe; color: #075985; }
    .badge-discrepancy { background: #fee2e2; color: #991b1b; }
    .badge-ignored { background: #f1f5f9; color: #64748b; }
    .signature-section { margin-top: 48px; border-top: 1px dashed #cbd5e1; padding-top: 24px; display: flex; justify-content: space-between; }
    .sig-box { width: 45%; }
    .sig-line { border-bottom: 1px solid #0f172a; height: 40px; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Bank Reconciliation Report</div>
      <div class="subtitle">${report.projectName} — ${monthLabel}</div>
      <div class="subtitle">${report.address}</div>
    </div>
    <div style="text-align: right;">
      <div class="badge ${report.status === 'RECONCILED' ? 'badge-matched' : 'badge-discrepancy'}">
        STATUS: ${report.status}
      </div>
      <div class="subtitle" style="margin-top: 8px;">Report Date: ${new Date().toLocaleDateString()}</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="card">
      <div class="card-lbl">Statement Balance</div>
      <div class="card-val">$${report.bankStatementBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="card">
      <div class="card-lbl">PaperWorking Balance</div>
      <div class="card-val">$${report.paperWorkingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="card">
      <div class="card-lbl">Variance / Difference</div>
      <div class="card-val" style="color: ${report.difference === 0 ? '#166534' : '#b91c1c'}">
        $${report.difference.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </div>
    </div>
    <div class="card">
      <div class="card-lbl">Matched / Reviewed</div>
      <div class="card-val">${report.summary.matchedCount + report.summary.verifiedCount} / ${report.summary.totalItems}</div>
    </div>
  </div>

  <h3>Itemized Reconciliation Ledger</h3>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Type</th>
        <th>Bank ($)</th>
        <th>PaperWorking ($)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${report.items
        .map(
          (item) => `
        <tr>
          <td>${new Date(item.date).toLocaleDateString()}</td>
          <td>${item.description}</td>
          <td>${item.itemType}</td>
          <td>${item.bankAmount !== null ? '$' + item.bankAmount.toFixed(2) : '—'}</td>
          <td>${item.paperWorkingAmount !== null ? '$' + item.paperWorkingAmount.toFixed(2) : '—'}</td>
          <td><span class="badge badge-${item.status.toLowerCase()}">${item.status}</span></td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  ${report.notes ? `<div style="margin-top: 24px; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;"><strong>Reconciliation Notes:</strong> ${report.notes}</div>` : ''}

  <div class="signature-section">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div>Prepared By: ${report.reconcilerName || report.reconciledBy || 'Accountant'}</div>
      <div style="font-size: 11px; color: #64748b;">Date: ${report.reconciledAt ? new Date(report.reconciledAt).toLocaleDateString() : '____/____/________'}</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div>CPA / Lead Investor Signature</div>
      <div style="font-size: 11px; color: #64748b;">Date: ____/____/________</div>
    </div>
  </div>
</body>
</html>`;
  }
}
