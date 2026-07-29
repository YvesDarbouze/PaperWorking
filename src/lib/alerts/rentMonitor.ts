import { adminDb } from '@/lib/firebase/admin';
import prisma from '@/lib/prisma';

/**
 * Checks if expected rent transaction has been received for the specified project.
 * If rent is overdue and grace period has expired, creates a 'missed_rent' inbox item alert.
 *
 * @param projectId The ID of the project to check
 * @returns Promise<boolean> True if alert is active (created or updated), false if rent paid or check not applicable.
 */
export async function checkMissingRent(projectId: string): Promise<boolean> {
  // 1. Load project from Firestore
  const projectSnap = await adminDb.collection('projects').doc(projectId).get();
  if (!projectSnap.exists) {
    return false;
  }

  const project = projectSnap.data();
  if (!project) {
    return false;
  }

  // 2. Validate applicability (RENT disposition, 'hold' or 'exit' phase)
  if (project.dispositionType !== 'RENT') {
    return false;
  }

  if (project.phase !== 'hold' && project.phase !== 'exit') {
    return false;
  }

  // 3. Skip check if property is a short-term rental (STR)
  const subStrategy = (project.subStrategy || '').toUpperCase();
  const propertyType = (project.propertyType || '').toUpperCase();
  if (
    subStrategy === 'AIRBNB' ||
    subStrategy === 'STR' ||
    subStrategy === 'SHORT_TERM' ||
    propertyType === 'STR' ||
    propertyType === 'SHORT_TERM'
  ) {
    return false;
  }

  // 4. Calculate expected rent due day of month
  let dueDay = 1;
  if (project.financials?.rentDueDate) {
    dueDay = Number(project.financials.rentDueDate);
  } else if (project.acquisitionDate) {
    const acqDate = project.acquisitionDate.toDate
      ? project.acquisitionDate.toDate()
      : new Date(project.acquisitionDate);
    if (!isNaN(acqDate.getTime())) {
      dueDay = acqDate.getDate();
    }
  }

  if (dueDay < 1 || dueDay > 28) {
    dueDay = 1;
  }

  // 5. Determine the expected rent date to check (based on 5 days grace period)
  const today = new Date();
  const currentExpected = new Date(today.getFullYear(), today.getMonth(), dueDay);
  const currentGrace = new Date(currentExpected);
  currentGrace.setDate(currentGrace.getDate() + 5);

  let expectedDate = currentExpected;
  if (today < currentGrace) {
    // Current month's grace period is not yet expired, check previous month
    expectedDate = new Date(today.getFullYear(), today.getMonth() - 1, dueDay);
  }

  const expectedDateStr = expectedDate.toISOString().split('T')[0];

  // 6. Normalize monthly rent amount to cents
  const monthlyGrossRent = Number(project.financials?.monthlyGrossRent || project.monthlyGrossRent || 0);
  if (monthlyGrossRent <= 0) {
    return false;
  }

  let expectedRentCents = monthlyGrossRent;
  if (expectedRentCents < 100000) {
    // Convert dollars to cents
    expectedRentCents = expectedRentCents * 100;
  }

  // 7. Search local Transaction table in Postgres (allowing early payments up to 5 days before expected date)
  const graceStart = new Date(expectedDate);
  graceStart.setDate(graceStart.getDate() - 5);
  const graceEnd = new Date(expectedDate);
  graceEnd.setDate(graceEnd.getDate() + 5);

  const minAmount = expectedRentCents * 0.9;
  const maxAmount = expectedRentCents * 1.1;

  const matchingTx = await prisma.transaction.findFirst({
    where: {
      projectId,
      reiCategory: 'rental_income',
      amount: {
        gte: BigInt(Math.round(minAmount)),
        lte: BigInt(Math.round(maxAmount)),
      },
      date: {
        gte: graceStart,
        lte: graceEnd,
      },
    },
  });

  if (matchingTx) {
    return false;
  }

  // 8. Deduplicate or create alert
  const orgId = project.organizationId || 'org_placeholder';
  
  const existingAlerts = await adminDb.collection('inboxItems')
    .where('type', '==', 'missed_rent')
    .where('metadata.projectId', '==', projectId)
    .where('metadata.expectedDate', '==', expectedDateStr)
    .where('archived', '==', false)
    .get();

  if (!existingAlerts.empty) {
    const existingDoc = existingAlerts.docs[0];
    await existingDoc.ref.update({
      updatedAt: new Date(),
    });
    return true;
  }

  // Retrieve recipient UID (must correspond to an org user/owner)
  let recipientUid = project.userId || project.ownerId || '';
  if (!recipientUid && orgId !== 'org_placeholder') {
    const usersSnap = await adminDb.collection('users')
      .where('organizationId', '==', orgId)
      .limit(1)
      .get();
    if (!usersSnap.empty) {
      recipientUid = usersSnap.docs[0].id;
    }
  }

  if (!recipientUid) {
    recipientUid = 'mock-user-id'; // Fallback
  }

  const formattedAmount = (expectedRentCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const formattedDate = expectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const bodyText = `No matching rent transaction observed for ${project.propertyName || project.name || 'Property'} as of ${formattedDate}. Expected: ${formattedAmount}.`;

  const itemId = `inb_missed_rent_${projectId}_${expectedDateStr.replace(/-/g, '_')}`;
  const inboxItem = {
    id: itemId,
    recipientUid,
    organizationId: orgId,
    type: 'missed_rent',
    priority: 'high',
    title: `Rent Missing: ${project.address || 'Property'}`,
    body: bodyText,
    senderUid: 'system',
    senderName: 'PaperWorking',
    senderAvatarInitial: 'P',
    read: false,
    archived: false,
    createdAt: new Date(),
    metadata: {
      projectId,
      expectedDate: expectedDateStr,
      expectedAmount: expectedRentCents / 100,
      gracePeriodDays: 5,
    },
  };

  await adminDb.collection('inboxItems').doc(itemId).set(inboxItem);
  return true;
}
