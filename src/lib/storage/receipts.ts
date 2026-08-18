export interface ProjectExpense {
  expenseId: string;
  projectId: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  receiptDocId?: string;
}

export interface ReceiptLinkStatus {
  docId: string;
  isReceipt: boolean;
  linkedExpenseId?: string;
  linkedExpenseDescription?: string;
  badgeLabel: string;
  badgeStatus: 'linked' | 'unlinked' | 'not_receipt';
}

/**
 * Evaluates receipt linking status and badge display text
 */
export function getReceiptLinkStatus(
  docId: string,
  category: string,
  linkedExpense?: ProjectExpense
): ReceiptLinkStatus {
  const isReceipt = category === 'hold' || category === 'tax' || category === 'rehab_receipts';

  if (!isReceipt) {
    return {
      docId,
      isReceipt: false,
      badgeLabel: 'Document',
      badgeStatus: 'not_receipt',
    };
  }

  if (linkedExpense) {
    return {
      docId,
      isReceipt: true,
      linkedExpenseId: linkedExpense.expenseId,
      linkedExpenseDescription: linkedExpense.description,
      badgeLabel: `✓ Linked to ${linkedExpense.description} ($${linkedExpense.amount})`,
      badgeStatus: 'linked',
    };
  }

  return {
    docId,
    isReceipt: true,
    badgeLabel: '⚠ Unlinked — link to expense for tax compliance',
    badgeStatus: 'unlinked',
  };
}

/**
 * Links a receipt document to an expense
 */
export function linkReceiptToExpense(
  receiptDocId: string,
  expense: ProjectExpense
): ProjectExpense {
  return {
    ...expense,
    receiptDocId,
  };
}
