'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Negotiation, NegotiationRound, RoundType, NegotiationStatus } from '@/types/negotiation';
import type { DealListing } from '@/types/listing';
import { NotificationService } from '@/lib/services/notificationService';
import { syncFractionalInvestorFromCommitment } from '@/lib/firebase/syncFractionalInvestors';

// ── Auth Verification ────────────────────────────────────

interface VerifiedUser {
  uid: string;
  role: string;
  organizationId: string;
  accountType?: string;
  displayName?: string;
  email?: string;
  [key: string]: unknown;
}

async function verifyActionAuth(idToken: string): Promise<VerifiedUser> {
  if (!idToken) throw new Error('Missing authentication token.');
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
      } as unknown as VerifiedUser;
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userDocRef = adminDb.collection('users').doc(decodedToken.uid);
    const userSnap = await userDocRef.get();

    if (!userSnap.exists) throw new Error('User profile not found in database.');

    const userData = userSnap.data() as Record<string, unknown>;
    return { uid: decodedToken.uid, ...userData } as VerifiedUser;
  } catch (err) {
    console.error('Server Action Auth Error:', err);
    throw new Error('Unauthorized');
  }
}

function rejectVendor(user: VerifiedUser) {
  if (user.accountType === 'vendor' || user.role === 'Vendor') {
    throw new Error('Not Found');
  }
}

// Helper to block non-subscribers
function assertSubscriber(user: VerifiedUser) {
  const plan = user.subscriptionPlan as string | undefined;
  const status = user.subscriptionStatus as string | undefined;
  if (
    !plan ||
    plan === 'None' ||
    plan === 'Vendor Network' ||
    status !== 'active'
  ) {
    throw new Error('An active subscription is required to perform this action.');
  }
}

// ─────────────────────────────────────────────────────────
// 1. PROPOSE TERMS (Investor Agree / Counter)
// ─────────────────────────────────────────────────────────

export async function proposeNegotiationTerms(
  idToken: string,
  listingId: string,
  terms: {
    contributionCents: number;
    equityPct?: number; // Optional for Agree (computed live/server), required for Counter
    isCounter: boolean;
    note?: string;
  }
): Promise<{ success: boolean; negotiationId: string }> {
  try {
    const user = await verifyActionAuth(idToken);
    rejectVendor(user);
    assertSubscriber(user);

    // Get the listing
    const listingSnap = await adminDb.collection('dealListings').doc(listingId).get();
    if (!listingSnap.exists) throw new Error('Listing not found.');
    const listing = listingSnap.data() as DealListing;

    if (listing.status === 'closed') {
      throw new Error('This listing has been closed.');
    }

    const projectId = listing.projectId;
    const negotiationId = `${projectId}_${user.uid}`;
    const now = new Date().toISOString();

    // Check listing equityTerms
    if (!listing.equityTerms) {
      throw new Error('Equity terms are not configured for this listing.');
    }

    const { fundingTarget, equityOfferedPct, priceBasis } = listing.equityTerms;

    // Validate min ticket
    if (terms.contributionCents < listing.equityTerms.minTicket) {
      throw new Error(`Investment must meet the minimum ticket size of $${(listing.equityTerms.minTicket / 100).toLocaleString()}`);
    }

    // Determine final contribution and equity %
    let finalEquityPct = terms.equityPct ?? 0;
    if (!terms.isCounter) {
      // Compute equity share live: contribution ÷ funding target × equity offered %
      finalEquityPct = Number(((terms.contributionCents / fundingTarget) * equityOfferedPct).toFixed(4));
    }

    const negRef = adminDb.collection('negotiations').doc(negotiationId);
    const negSnap = await negRef.get();

    let rounds: NegotiationRound[] = [];
    let currentVersion = 1;

    if (negSnap.exists) {
      const data = negSnap.data() as Negotiation;
      if (data.status === 'transaction_confirmed') {
        throw new Error('Negotiation is completed and locked.');
      }
      rounds = data.rounds || [];
      currentVersion = (data.currentTerms?.version ?? 0) + 1;
    }

    const newRound: NegotiationRound = {
      version: currentVersion,
      type: terms.isCounter ? 'counter' : 'agree',
      senderUid: user.uid,
      senderName: user.displayName || user.email || 'Investor',
      createdAt: now,
      priceBasis,
      contribution: terms.contributionCents,
      equityPercentage: finalEquityPct,
      note: terms.note || '',
    };

    rounds.push(newRound);

    const updatedNegotiation: Partial<Negotiation> = {
      id: negotiationId,
      projectId,
      projectName: listing.propertyName,
      listingId,
      leadInvestorUid: listing.ownerUid,
      leadInvestorName: listing.leadInvestor.displayName,
      investorUid: user.uid,
      investorName: user.displayName || user.email || 'Investor',
      investorEmail: user.email || '',
      status: 'active',
      currentTerms: {
        priceBasis,
        contribution: terms.contributionCents,
        equityPercentage: finalEquityPct,
        isCounter: terms.isCounter,
        version: currentVersion,
        proposedBy: 'investor',
        note: terms.note || '',
        createdAt: now,
      },
      rounds,
      updatedAt: now,
    };

    if (!negSnap.exists) {
      updatedNegotiation.confirmations = {};
      updatedNegotiation.createdAt = now;
      await negRef.set(updatedNegotiation);
    } else {
      await negRef.update(updatedNegotiation);
    }

    // Send notification to Lead Investor
    try {
      await NotificationService.createNotification({
        recipientId: listing.ownerUid,
        type: 'NEGOTIATION_UPDATE',
        actor: { uid: user.uid, name: user.displayName || user.email || 'Investor' },
        objectReference: {
          projectId,
          dealAddress: listing.address,
          metadata: {
            negotiationId,
            subject: terms.isCounter ? 'Counter Terms Proposed' : 'Agreed to Terms',
            body: `${user.displayName || user.email} has ${terms.isCounter ? 'countered terms' : 'agreed to terms'} for ${listing.propertyName}.`,
          },
        },
        deepLinkUrl: `/dashboard/inbox?negotiationId=${negotiationId}`,
      });
    } catch (notifErr) {
      console.error('Failed to send proposal notification:', notifErr);
    }

    return { success: true, negotiationId };
  } catch (err) {
    console.error('proposeNegotiationTerms error:', err);
    throw err instanceof Error ? err : new Error('Failed to propose terms.');
  }
}

// ─────────────────────────────────────────────────────────
// 2. RESPOND TO NEGOTIATION ROUND (Lead Investor Accept/Decline/Counter)
// ─────────────────────────────────────────────────────────

export async function respondToNegotiationRound(
  idToken: string,
  negotiationId: string,
  action: 'accept' | 'decline' | 'counter',
  counterTerms?: {
    contributionCents: number;
    equityPct: number;
    note?: string;
  }
): Promise<{ success: boolean }> {
  try {
    const user = await verifyActionAuth(idToken);
    rejectVendor(user);

    const negRef = adminDb.collection('negotiations').doc(negotiationId);
    const negSnap = await negRef.get();
    if (!negSnap.exists) throw new Error('Negotiation thread not found.');

    const neg = negSnap.data() as Negotiation;
    if (neg.leadInvestorUid !== user.uid) {
      throw new Error('Only the Lead Investor can respond to these terms.');
    }

    if (neg.status === 'transaction_confirmed') {
      throw new Error('Negotiation is completed and locked.');
    }

    const now = new Date().toISOString();
    const currentVersion = (neg.currentTerms?.version ?? 0) + 1;
    const rounds = [...(neg.rounds || [])];
    let newStatus: NegotiationStatus = neg.status;

    if (action === 'accept') {
      newStatus = 'accepted';
      const acceptRound: NegotiationRound = {
        version: currentVersion,
        type: 'accept',
        senderUid: user.uid,
        senderName: user.displayName || user.email || 'Lead Investor',
        createdAt: now,
        priceBasis: neg.currentTerms.priceBasis,
        contribution: neg.currentTerms.contribution,
        equityPercentage: neg.currentTerms.equityPercentage,
        note: 'Terms accepted as proposed.',
      };
      rounds.push(acceptRound);

      await negRef.update({
        status: newStatus,
        'currentTerms.isCounter': false,
        'currentTerms.proposedBy': 'lead',
        'currentTerms.version': currentVersion,
        'currentTerms.createdAt': now,
        rounds,
        updatedAt: now,
      });

    } else if (action === 'decline') {
      newStatus = 'declined';
      const declineRound: NegotiationRound = {
        version: currentVersion,
        type: 'decline',
        senderUid: user.uid,
        senderName: user.displayName || user.email || 'Lead Investor',
        createdAt: now,
        note: 'Terms declined.',
      };
      rounds.push(declineRound);

      await negRef.update({
        status: newStatus,
        rounds,
        updatedAt: now,
      });

    } else if (action === 'counter') {
      if (!counterTerms) throw new Error('Counter terms are required.');
      newStatus = 'active';

      const counterRound: NegotiationRound = {
        version: currentVersion,
        type: 'counter',
        senderUid: user.uid,
        senderName: user.displayName || user.email || 'Lead Investor',
        createdAt: now,
        priceBasis: neg.currentTerms.priceBasis,
        contribution: counterTerms.contributionCents,
        equityPercentage: counterTerms.equityPct,
        note: counterTerms.note || '',
      };
      rounds.push(counterRound);

      await negRef.update({
        status: newStatus,
        currentTerms: {
          priceBasis: neg.currentTerms.priceBasis,
          contribution: counterTerms.contributionCents,
          equityPercentage: counterTerms.equityPct,
          isCounter: true,
          version: currentVersion,
          proposedBy: 'lead',
          note: counterTerms.note || '',
          createdAt: now,
        },
        rounds,
        updatedAt: now,
      });
    }

    // Notify the investor
    try {
      await NotificationService.createNotification({
        recipientId: neg.investorUid,
        type: 'NEGOTIATION_UPDATE',
        actor: { uid: user.uid, name: user.displayName || user.email || 'Lead Investor' },
        objectReference: {
          projectId: neg.projectId,
          metadata: {
            negotiationId,
            subject: action === 'accept' ? 'Terms Accepted' : action === 'decline' ? 'Terms Declined' : 'Counter Offer Proposed',
            body: `${user.displayName || user.email} has ${action === 'accept' ? 'accepted the terms' : action === 'decline' ? 'declined the terms' : 'countered the terms'} for ${neg.projectName}.`,
          },
        },
        deepLinkUrl: `/dashboard/inbox?negotiationId=${negotiationId}`,
      });
    } catch (notifErr) {
      console.error('Failed to send response notification:', notifErr);
    }

    return { success: true };
  } catch (err) {
    console.error('respondToNegotiationRound error:', err);
    throw err instanceof Error ? err : new Error('Failed to respond to terms.');
  }
}

// ─────────────────────────────────────────────────────────
// 3. ISSUE FINAL TERMS (Lead Investor only)
// ─────────────────────────────────────────────────────────

export async function issueFinalTerms(
  idToken: string,
  negotiationId: string,
  terms: {
    priceBasisCents: number;
    contributionCents: number;
    equityPct: number;
    estimatedClosingDate?: string;
  }
): Promise<{ success: boolean }> {
  try {
    const user = await verifyActionAuth(idToken);
    rejectVendor(user);

    const negRef = adminDb.collection('negotiations').doc(negotiationId);
    const negSnap = await negRef.get();
    if (!negSnap.exists) throw new Error('Negotiation thread not found.');

    const neg = negSnap.data() as Negotiation;
    if (neg.leadInvestorUid !== user.uid) {
      throw new Error('Only the Lead Investor can issue final terms.');
    }

    const now = new Date().toISOString();
    const currentVersion = (neg.currentTerms?.version ?? 0) + 1;
    const rounds = [...(neg.rounds || [])];

    const finalTermsRound: NegotiationRound = {
      version: currentVersion,
      type: 'final_terms',
      senderUid: user.uid,
      senderName: user.displayName || user.email || 'Lead Investor',
      createdAt: now,
      priceBasis: terms.priceBasisCents,
      contribution: terms.contributionCents,
      equityPercentage: terms.equityPct,
      note: `Issued Final Terms. Estimated Closing: ${terms.estimatedClosingDate || '—'}`,
    };
    rounds.push(finalTermsRound);

    await negRef.update({
      'confirmations.finalTermsLead': {
        confirmedAt: now,
        priceBasis: terms.priceBasisCents,
        contribution: terms.contributionCents,
        equityPercentage: terms.equityPct,
      },
      // Reset investor final terms confirmation as new final terms are issued
      'confirmations.finalTermsInvestor': FieldValue.delete(),
      rounds,
      updatedAt: now,
    });

    // Notify investor
    try {
      await NotificationService.createNotification({
        recipientId: neg.investorUid,
        type: 'NEGOTIATION_UPDATE',
        actor: { uid: user.uid, name: user.displayName || user.email || 'Lead Investor' },
        objectReference: {
          projectId: neg.projectId,
          metadata: {
            negotiationId,
            subject: 'Final Terms Issued',
            body: `${user.displayName || user.email} has issued the Final Terms sheet for ${neg.projectName}. Review and confirm in your inbox.`,
          },
        },
        deepLinkUrl: `/dashboard/inbox?negotiationId=${negotiationId}`,
      });
    } catch (notifErr) {
      console.error('Failed to send final terms notification:', notifErr);
    }

    return { success: true };
  } catch (err) {
    console.error('issueFinalTerms error:', err);
    throw err instanceof Error ? err : new Error('Failed to issue final terms.');
  }
}

// ─────────────────────────────────────────────────────────
// 4. CONFIRM FINAL TERMS (Investor only)
// ─────────────────────────────────────────────────────────

export async function confirmFinalTerms(
  idToken: string,
  negotiationId: string
): Promise<{ success: boolean }> {
  try {
    const user = await verifyActionAuth(idToken);
    rejectVendor(user);

    const negRef = adminDb.collection('negotiations').doc(negotiationId);
    const negSnap = await negRef.get();
    if (!negSnap.exists) throw new Error('Negotiation thread not found.');

    const neg = negSnap.data() as Negotiation;
    if (neg.investorUid !== user.uid) {
      throw new Error('Only the responding investor can confirm final terms.');
    }

    const leadConfirm = neg.confirmations?.finalTermsLead;
    if (!leadConfirm) {
      throw new Error('Lead Investor has not issued final terms yet.');
    }

    const now = new Date().toISOString();
    const rounds = [...(neg.rounds || [])];
    const currentVersion = (neg.currentTerms?.version ?? 0) + 1;

    // Record investor confirmation
    const finalTermsInvestor = {
      confirmedAt: now,
      priceBasis: leadConfirm.priceBasis,
      contribution: leadConfirm.contribution,
      equityPercentage: leadConfirm.equityPercentage,
    };

    const confirmRound: NegotiationRound = {
      version: currentVersion,
      type: 'message',
      senderUid: user.uid,
      senderName: user.displayName || user.email || 'Investor',
      createdAt: now,
      note: 'Confirmed Final Terms. (Non-Binding)',
    };
    rounds.push(confirmRound);

    // Create non-binding termsConfirmationRecord
    const termsConfirmationRecord = {
      confirmedAt: now,
      priceBasis: leadConfirm.priceBasis,
      contribution: leadConfirm.contribution,
      equityPercentage: leadConfirm.equityPercentage,
      investorName: neg.investorName,
      leadName: neg.leadInvestorName,
      nonBindingAcknowledgeText: 'This records the terms both parties intend to execute. Legal execution occurs outside PaperWorking.',
    };

    await negRef.update({
      status: 'terms_confirmed',
      'confirmations.finalTermsInvestor': finalTermsInvestor,
      termsConfirmationRecord,
      rounds,
      updatedAt: now,
    });

    // Notify Lead Investor
    try {
      await NotificationService.createNotification({
        recipientId: neg.leadInvestorUid,
        type: 'NEGOTIATION_UPDATE',
        actor: { uid: user.uid, name: user.displayName || user.email || 'Investor' },
        objectReference: {
          projectId: neg.projectId,
          metadata: {
            negotiationId,
            subject: 'Final Terms Double-Confirmed',
            body: `${user.displayName || user.email} has confirmed the final terms for ${neg.projectName}.`,
          },
        },
        deepLinkUrl: `/dashboard/inbox?negotiationId=${negotiationId}`,
      });
    } catch (notifErr) {
      console.error('Failed to send final terms confirmation notification:', notifErr);
    }

    return { success: true };
  } catch (err) {
    console.error('confirmFinalTerms error:', err);
    throw err instanceof Error ? err : new Error('Failed to confirm final terms.');
  }
}

// ─────────────────────────────────────────────────────────
// 5. MARK TRANSACTION COMPLETED (Lead Investor only)
// ─────────────────────────────────────────────────────────

export async function markTransactionCompleted(
  idToken: string,
  negotiationId: string,
  numbers: {
    priceBasisCents: number;
    contributionCents: number;
    equityPct: number;
  }
): Promise<{ success: boolean }> {
  try {
    const user = await verifyActionAuth(idToken);
    rejectVendor(user);

    const negRef = adminDb.collection('negotiations').doc(negotiationId);
    const negSnap = await negRef.get();
    if (!negSnap.exists) throw new Error('Negotiation thread not found.');

    const neg = negSnap.data() as Negotiation;
    if (neg.leadInvestorUid !== user.uid) {
      throw new Error('Only the Lead Investor can record transaction completion.');
    }

    const now = new Date().toISOString();
    const rounds = [...(neg.rounds || [])];
    const currentVersion = (neg.currentTerms?.version ?? 0) + 1;

    const txnRound: NegotiationRound = {
      version: currentVersion,
      type: 'message',
      senderUid: user.uid,
      senderName: user.displayName || user.email || 'Lead Investor',
      createdAt: now,
      note: `Marked investment transaction completed. Price basis: $${(numbers.priceBasisCents / 100).toLocaleString()} · Contribution: $${(numbers.contributionCents / 100).toLocaleString()} · Equity: ${numbers.equityPct}%. Pending investor confirmation.`,
    };
    rounds.push(txnRound);

    await negRef.update({
      status: 'transaction_pending',
      'confirmations.transactionLead': {
        confirmedAt: now,
        priceBasis: numbers.priceBasisCents,
        contribution: numbers.contributionCents,
        equityPercentage: numbers.equityPct,
      },
      // Reset investor confirmation for this round
      'confirmations.transactionInvestor': FieldValue.delete(),
      rounds,
      updatedAt: now,
    });

    // Notify investor
    try {
      await NotificationService.createNotification({
        recipientId: neg.investorUid,
        type: 'NEGOTIATION_UPDATE',
        actor: { uid: user.uid, name: user.displayName || user.email || 'Lead Investor' },
        objectReference: {
          projectId: neg.projectId,
          metadata: {
            negotiationId,
            subject: 'Transaction Confirmed by Lead',
            body: `${user.displayName || user.email} has marked the investment completed. Please confirm the final transaction numbers in your inbox.`,
          },
        },
        deepLinkUrl: `/dashboard/inbox?negotiationId=${negotiationId}`,
      });
    } catch (notifErr) {
      console.error('Failed to send transaction notification:', notifErr);
    }

    return { success: true };
  } catch (err) {
    console.error('markTransactionCompleted error:', err);
    throw err instanceof Error ? err : new Error('Failed to complete transaction.');
  }
}

// ─────────────────────────────────────────────────────────
// 6. CONFIRM TRANSACTION NUMBERS (Investor only → pre-fills Cap Table)
// ─────────────────────────────────────────────────────────

export async function confirmTransactionNumbers(
  idToken: string,
  negotiationId: string
): Promise<{ success: boolean }> {
  try {
    const user = await verifyActionAuth(idToken);
    rejectVendor(user);

    const negRef = adminDb.collection('negotiations').doc(negotiationId);
    const negSnap = await negRef.get();
    if (!negSnap.exists) throw new Error('Negotiation thread not found.');

    const neg = negSnap.data() as Negotiation;
    if (neg.investorUid !== user.uid) {
      throw new Error('Only the responding investor can confirm final transaction numbers.');
    }

    const leadTxn = neg.confirmations?.transactionLead;
    if (!leadTxn) {
      throw new Error('Lead Investor has not recorded transaction details yet.');
    }

    const now = new Date().toISOString();
    const rounds = [...(neg.rounds || [])];
    const currentVersion = (neg.currentTerms?.version ?? 0) + 1;

    // Record investor confirmation
    const transactionInvestor = {
      confirmedAt: now,
      priceBasis: leadTxn.priceBasis,
      contribution: leadTxn.contribution,
      equityPercentage: leadTxn.equityPercentage,
    };

    const confirmRound: NegotiationRound = {
      version: currentVersion,
      type: 'message',
      senderUid: user.uid,
      senderName: user.displayName || user.email || 'Investor',
      createdAt: now,
      note: `Confirmed final transaction numbers. Price basis: $${(leadTxn.priceBasis / 100).toLocaleString()} · Contribution: $${(leadTxn.contribution / 100).toLocaleString()} · Equity: ${leadTxn.equityPercentage}%.`,
    };
    rounds.push(confirmRound);

    // Build unique ID for record, versioning increments if correction superseded it
    const recordId = `${negotiationId}_txn`;
    const oldRecordVersion = neg.transactionConfirmationRecord?.version ?? 0;

    const transactionConfirmationRecord = {
      id: recordId,
      confirmedAt: now,
      priceBasis: leadTxn.priceBasis,
      contribution: leadTxn.contribution,
      equityPercentage: leadTxn.equityPercentage,
      locked: true,
      version: oldRecordVersion + 1,
      createdAt: neg.transactionConfirmationRecord?.createdAt || now,
    };

    await negRef.update({
      status: 'transaction_confirmed',
      'confirmations.transactionInvestor': transactionInvestor,
      transactionConfirmationRecord,
      rounds,
      updatedAt: now,
    });

    // Write to projects/{projectId}/commitments subcollection with status 'cleared' (confirmed)
    // This pre-fills the Fund's Investment Team cap table (fractionalInvestors) via legacy sync.
    try {
      const commitmentsRef = adminDb.collection('projects').doc(neg.projectId).collection('commitments');
      await commitmentsRef.doc(negotiationId).set({
        id: negotiationId,
        projectId: neg.projectId,
        listingId: neg.listingId,
        name: neg.investorName,
        email: neg.investorEmail,
        amountCents: leadTxn.contribution,
        status: 'cleared', // Cleared corresponds to 'confirmed' status on Cap Table
        notes: `Marketplace Ingested Transaction (Double-Confirmed). Ref ID: ${negotiationId}`,
        createdAt: now,
        updatedAt: now,
      });

      // Invoke the Cap Table sync bridge
      await syncFractionalInvestorFromCommitment(neg.projectId, {
        id: negotiationId,
        name: neg.investorName,
        email: neg.investorEmail,
        amountCents: leadTxn.contribution,
        status: 'cleared',
      });
    } catch (syncErr) {
      console.error('Failed to sync transaction to project cap table:', syncErr);
    }

    // Notify Lead Investor
    try {
      await NotificationService.createNotification({
        recipientId: neg.leadInvestorUid,
        type: 'NEGOTIATION_UPDATE',
        actor: { uid: user.uid, name: user.displayName || user.email || 'Investor' },
        objectReference: {
          projectId: neg.projectId,
          metadata: {
            negotiationId,
            subject: 'Transaction Fully Confirmed & Locked',
            body: `${user.displayName || user.email} has confirmed final transaction numbers. Transaction locked. Partner cap table has been pre-filled.`,
          },
        },
        deepLinkUrl: `/dashboard/inbox?negotiationId=${negotiationId}`,
      });
    } catch (notifErr) {
      console.error('Failed to send transaction confirmation notification:', notifErr);
    }

    return { success: true };
  } catch (err) {
    console.error('confirmTransactionNumbers error:', err);
    throw err instanceof Error ? err : new Error('Failed to confirm transaction numbers.');
  }
}

// ─────────────────────────────────────────────────────────
// 7. CORRECT TRANSACTION RECORD (Lead Investor only)
// ─────────────────────────────────────────────────────────

export async function correctTransactionRecord(
  idToken: string,
  negotiationId: string,
  newNumbers: {
    priceBasisCents: number;
    contributionCents: number;
    equityPct: number;
  }
): Promise<{ success: boolean }> {
  try {
    const user = await verifyActionAuth(idToken);
    rejectVendor(user);

    const negRef = adminDb.collection('negotiations').doc(negotiationId);
    const negSnap = await negRef.get();
    if (!negSnap.exists) throw new Error('Negotiation thread not found.');

    const neg = negSnap.data() as Negotiation;
    if (neg.leadInvestorUid !== user.uid) {
      throw new Error('Only the Lead Investor can correct transaction records.');
    }

    const currentRecord = neg.transactionConfirmationRecord;
    if (!currentRecord || !currentRecord.locked) {
      throw new Error('There is no locked transaction record to correct.');
    }

    const now = new Date().toISOString();
    const rounds = [...(neg.rounds || [])];
    const currentVersion = (neg.currentTerms?.version ?? 0) + 1;

    // Log the correction proposal round
    const correctionRound: NegotiationRound = {
      version: currentVersion,
      type: 'message',
      senderUid: user.uid,
      senderName: user.displayName || user.email || 'Lead Investor',
      createdAt: now,
      note: `PROPOSED CORRECTION to locked transaction. Old numbers superseded. New proposed numbers: Price basis: $${(newNumbers.priceBasisCents / 100).toLocaleString()} · Contribution: $${(newNumbers.contributionCents / 100).toLocaleString()} · Equity: ${newNumbers.equityPct}%. Pending investor confirmation.`,
    };
    rounds.push(correctionRound);

    // Create a new version of the transaction record, marked as unlocked (pending) and linking to the previous superseded record
    const supersededRecord = {
      id: `${negotiationId}_txn_v${currentRecord.version}`,
      confirmedAt: currentRecord.confirmedAt,
      priceBasis: currentRecord.priceBasis,
      contribution: currentRecord.contribution,
      equityPercentage: currentRecord.equityPercentage,
      locked: false, // unlocked pending confirmation
      supersededById: currentRecord.id || `${negotiationId}_txn`,
      version: currentRecord.version + 1,
      createdAt: now,
    };

    await negRef.update({
      status: 'transaction_pending',
      'confirmations.transactionLead': {
        confirmedAt: now,
        priceBasis: newNumbers.priceBasisCents,
        contribution: newNumbers.contributionCents,
        equityPercentage: newNumbers.equityPct,
      },
      'confirmations.transactionInvestor': FieldValue.delete(),
      transactionConfirmationRecord: supersededRecord,
      rounds,
      updatedAt: now,
    });

    // Notify investor
    try {
      await NotificationService.createNotification({
        recipientId: neg.investorUid,
        type: 'NEGOTIATION_UPDATE',
        actor: { uid: user.uid, name: user.displayName || user.email || 'Lead Investor' },
        objectReference: {
          projectId: neg.projectId,
          metadata: {
            negotiationId,
            subject: 'Transaction Correction Proposed',
            body: `${user.displayName || user.email} has proposed a correction to the transaction record for ${neg.projectName}. Review and confirm new final numbers in your inbox.`,
          },
        },
        deepLinkUrl: `/dashboard/inbox?negotiationId=${negotiationId}`,
      });
    } catch (notifErr) {
      console.error('Failed to send correction notification:', notifErr);
    }

    return { success: true };
  } catch (err) {
    console.error('correctTransactionRecord error:', err);
    throw err instanceof Error ? err : new Error('Failed to correct transaction record.');
  }
}
