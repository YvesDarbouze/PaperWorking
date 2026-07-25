"use server";

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// ─── Types ─────────────────────────────────────────────────────
export interface FinancialsPayload {
  income: {
    grossRent: number;
    otherIncome: number;
    vacancyRate: number;
  };
  expenses: {
    opex: number;
  };
  financing: {
    loanAmount: number;
    interestRate: number;
    loanTermYears: number;
    otherMonthlyDebt: number;
  };
}

interface FinancialsDoc extends FinancialsPayload {
  updatedAt: FirebaseFirestore.Timestamp | FieldValue;
  updatedBy: string;
}

// ─── Auth helper (mirrors verifyActionAuth in actions/index.ts) ─
async function verifyAuth(idToken: string) {
  if (!idToken) throw new Error('Unauthorized');
  try {
    let isE2eTest = false;
    let cookieStore: any = null;
    try {
      const { cookies } = require('next/headers');
      cookieStore = await cookies();
      isE2eTest = cookieStore?.get('__e2e_test')?.value === '1';
    } catch {
      // Ignored
    }
    if ((process.env.NODE_ENV !== 'production' || isE2eTest) && (process.env.ENABLE_MOCK_AUTH === 'true' || process.env.NODE_ENV === 'test') && (idToken === 'mock_token' || idToken === 'mock_token_123' || idToken === 'mock_session_token_123')) {
      const uid = cookieStore?.get('mock_user_uid')?.value || 'user_lead_investor_seed';
      const email = cookieStore?.get('mock_user_email')?.value || 'marcus@apexcapital.io';
      const name = cookieStore?.get('mock_user_name')?.value || 'Marcus Aurelius';
      const role = cookieStore?.get('mock_user_role')?.value || 'Lead Investor';
      const accountType = cookieStore?.get('mock_user_account_type')?.value || (role === 'Vendor' ? 'vendor' : 'investor');
      const subscriptionPlan = cookieStore?.get('mock_user_subscription_plan')?.value || 'Team';
      const subscriptionStatus = subscriptionPlan === 'None' ? 'inactive' : 'active';
      const organizationId = cookieStore?.get('mock_user_org_id')?.value || 'org_paperworking_seed';
      return {
        uid,
        email,
        displayName: name,
        role,
        accountType,
        subscriptionPlan,
        subscriptionStatus,
        organizationId,
      };
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userSnap.exists) throw new Error('User profile not found.');
    const data = userSnap.data() as Record<string, unknown>;
    return { uid: decoded.uid, organizationId: data.organizationId as string, ...data };
  } catch {
    throw new Error('Unauthorized');
  }
}

// ─── Ownership / membership check ──────────────────────────────
async function verifyProjectAccess(projectRef: FirebaseFirestore.DocumentReference, uid: string, organizationId: string) {
  const snap = await projectRef.get();
  if (!snap.exists) throw new Error('Project not found.');
  const data = snap.data()!;

  // Owner check
  if (data.ownerUid === uid) return;

  // Organization match
  if (data.organizationId === organizationId) return;

  // Team membership check
  if (data.members?.[uid]) return;
  if (Array.isArray(data.assignedUsers) && data.assignedUsers.includes(uid)) return;

  throw new Error('You do not have access to this project.');
}

/**
 * SAVE FINANCIALS
 * Persists the Financials Terminal inputs to Firestore
 * at projects/{projectId}/financials/current
 */
export async function saveFinancials(
  idToken: string,
  projectId: string,
  data: FinancialsPayload
): Promise<{ success: true }> {
  const user = await verifyAuth(idToken);
  const projectRef = adminDb.collection('projects').doc(projectId);

  await verifyProjectAccess(projectRef, user.uid, user.organizationId);

  // Validate payload shape
  if (!data.income || !data.expenses || !data.financing) {
    throw new Error('Invalid financials payload — income, expenses, and financing are required.');
  }

  const doc: FinancialsDoc = {
    income: {
      grossRent: Number(data.income.grossRent) || 0,
      otherIncome: Number(data.income.otherIncome) || 0,
      vacancyRate: Number(data.income.vacancyRate) || 0,
    },
    expenses: {
      opex: Number(data.expenses.opex) || 0,
    },
    financing: {
      loanAmount: Number(data.financing.loanAmount) || 0,
      interestRate: Number(data.financing.interestRate) || 0,
      loanTermYears: Number(data.financing.loanTermYears) || 0,
      otherMonthlyDebt: Number(data.financing.otherMonthlyDebt) || 0,
    },
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: user.uid,
  };

  await adminDb
    .collection('projects')
    .doc(projectId)
    .collection('financials')
    .doc('current')
    .set(doc, { merge: true });

  return { success: true };
}

/**
 * LOAD FINANCIALS
 * Reads projects/{projectId}/financials/current from Firestore
 * Returns null if the document doesn't exist yet (first visit)
 */
export async function loadFinancials(
  idToken: string,
  projectId: string
): Promise<FinancialsPayload | null> {
  const user = await verifyAuth(idToken);
  const projectRef = adminDb.collection('projects').doc(projectId);

  await verifyProjectAccess(projectRef, user.uid, user.organizationId);

  const snap = await projectRef.collection('financials').doc('current').get();

  if (!snap.exists) return null;

  const d = snap.data()!;
  return {
    income: {
      grossRent: d.income?.grossRent ?? 0,
      otherIncome: d.income?.otherIncome ?? 0,
      vacancyRate: d.income?.vacancyRate ?? 0,
    },
    expenses: {
      opex: d.expenses?.opex ?? 0,
    },
    financing: {
      loanAmount: d.financing?.loanAmount ?? 0,
      interestRate: d.financing?.interestRate ?? 0,
      loanTermYears: d.financing?.loanTermYears ?? 0,
      otherMonthlyDebt: d.financing?.otherMonthlyDebt ?? 0,
    },
  };
}
