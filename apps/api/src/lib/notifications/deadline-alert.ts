export function validateDeadlineAlertBody(body: {
  recipientId?: unknown;
  projectId?: unknown;
  dealAddress?: unknown;
  contingencyType?: unknown;
  deadlineDate?: unknown;
  daysUntil?: unknown;
}): {
  ok: true;
  recipientId: string;
  projectId: string;
  dealAddress: string;
  contingencyType: string;
  deadlineDate: string;
  daysUntil: number;
} | { ok: false; error: string; status: number } {
  const recipientId = typeof body.recipientId === 'string' ? body.recipientId : '';
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const dealAddress = typeof body.dealAddress === 'string' ? body.dealAddress : '';
  const contingencyType = typeof body.contingencyType === 'string' ? body.contingencyType : '';
  const deadlineDate = typeof body.deadlineDate === 'string' ? body.deadlineDate : '';
  if (!recipientId || !projectId || !dealAddress || !contingencyType || !deadlineDate) {
    return {
      ok: false,
      error: 'Missing required fields: recipientId, projectId, dealAddress, contingencyType, deadlineDate',
      status: 400,
    };
  }
  const daysUntil = typeof body.daysUntil === 'number' ? body.daysUntil : 0;
  return { ok: true, recipientId, projectId, dealAddress, contingencyType, deadlineDate, daysUntil };
}

export function buildDeadlineTimeLabel(daysUntil: number): string {
  return daysUntil <= 1 ? `${daysUntil} day` : `${daysUntil} days`;
}
