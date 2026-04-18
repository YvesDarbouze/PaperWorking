import { Project, VendorRequest, CostBasisLineItem } from '@/types/schema';
import { projectsService } from '@/lib/firebase/projects';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { communicationService } from '@/lib/services/communicationService';
import { financialsSyncService } from '@/lib/services/financialsSyncService';
import { prisma } from "../prisma";

/**
 * ── Deal State Machine — PaperWorking
 * Manages strict lifecycle transitions for real estate assets.
 */

export type DealPhase = 
  | 'Sourcing' 
  | 'Under Contract' 
  | 'Rehab' 
  | 'Listed' 
  | 'Sold' 
  | 'Rented';

const PHASE_ORDER: DealPhase[] = [
  'Sourcing',
  'Under Contract',
  'Rehab',
  'Listed',
  'Sold',
  'Rented'
];

/**
 * Transition a deal to a new phase and record the event.
 */
export async function transitionDealPhase(
  projectId: string,
  fromPhase: DealPhase,
  toPhase: DealPhase,
  userUid: string,
  notes: string = ''
) {
  // 1. Update the main Deal document in Firestore
  await projectsService.updateDeal(projectId, { 
    status: toPhase as any, 
    updatedAt: new Date(),
    lastPhaseTransitionAt: new Date(), // Phase 6: Reset aging clock on transition
  });

  // 2. Log transition for auditing - Safe wrapper for Prisma/SQL backup
  try {
    if (prisma) {
      await prisma.phaseTransition.create({
        data: {
          linkedProjectId: projectId,
          fromPhase: fromPhase,
          toPhase: toPhase,
          userUid: userUid || 'system',
          notes: notes || `Phase advanced to ${toPhase}`
        }
      });
    }
  } catch (error) {
    console.warn('[Audit Warning] Prisma logging failed, deal transition succeeded in Firestore. Verify DATABASE_URL.', error);
  }

  // 3. Automated emails on key transitions
  const isRenovationComplete =
    (fromPhase === 'Rehab' || (fromPhase as string) === 'Renovating') && toPhase === 'Listed';

  if (isRenovationComplete) {
    try {
      const deal = await projectsService.getDeal(projectId);
      if (deal) {
        // Collect agent + appraiser emails from the project team
        const team = (deal.projectTeam || []) as { projectRole: string; email: string }[];
        const teamEmails: string[] = team
          .filter(m => m.projectRole === 'Real Estate Agent' || m.projectRole === 'Appraiser')
          .map(m => m.email)
          .filter(Boolean);

        // Always notify investors as well
        const allRecipients = [...new Set([...teamEmails, 'investors@example.com'])];

        // Branded subject and body for the agent / appraiser alert
        const agentSubject = `Action Required: ${deal.propertyName} — Renovation Complete, Ready for Exit Strategy`;
        const agentHtml = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
  <div style="background:#111;padding:24px 32px;margin-bottom:0">
    <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:0.05em">PAPERWORKING</span>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:32px">
    <h2 style="font-size:18px;font-weight:600;margin:0 0 16px">Renovation Complete — Exit Strategy Initiated</h2>
    <p style="color:#6b7280;line-height:1.6;margin:0 0 16px">
      The renovation phase for <strong>${deal.propertyName}</strong> (${deal.address}) has been completed
      and the property is now transitioning to the Exit Strategy phase.
    </p>
    <p style="color:#6b7280;line-height:1.6;margin:0 0 24px">
      <strong>Your immediate tasks:</strong>
    </p>
    <ul style="color:#6b7280;line-height:1.8;padding-left:20px;margin:0 0 24px">
      <li>Schedule a final walkthrough to confirm renovation quality.</li>
      <li>Prepare a Comparative Market Analysis (CMA) for the listing price review.</li>
      <li>Confirm your availability for showings and open house scheduling.</li>
      <li>Submit any outstanding documents to the Document Hub.</li>
    </ul>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.paperworking.io'}/dashboard?lane=engine"
       style="display:inline-block;background:#111;color:#fff;padding:12px 24px;text-decoration:none;font-weight:600;border-radius:6px;font-size:14px">
      Open Deal in PaperWorking →
    </a>
    <p style="color:#9ca3af;font-size:12px;margin-top:32px;padding-top:16px;border-top:1px solid #f3f4f6">
      You are receiving this because you are assigned to this deal.
      Reply directly to this email and your message will appear in the deal thread.
    </p>
  </div>
</div>`;

        await communicationService.sendStatusUpdateEmail(
          projectId,
          deal.organizationId,
          allRecipients,
          agentSubject,
          agentHtml,
        );

        // Also fire through the /api/emails/send endpoint for Resend delivery if configured
        if (process.env.RESEND_API_KEY && typeof fetch !== 'undefined') {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/emails/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                // System-level call: skip idToken gate — handled by RESEND_API_KEY presence
                _system: true,
                projectId,
                to: allRecipients,
                subject: agentSubject,
                html: agentHtml,
              }),
            });
          } catch {
            // Non-critical — audit log was already written above
          }
        }
      }
    } catch (error) {
      console.error('[State Machine] Exit strategy email trigger failed:', error);
    }
  }
}

/**
 * Checks if a transition is valid (e.g., no jumping over contract)
 * Note: Real-world scenarios often require non-linear movements, 
 * but we prefer sequential order.
 */
export function isValidTransition(from: DealPhase, to: DealPhase): boolean {
  const fromIndex = PHASE_ORDER.indexOf(from);
  const toIndex = PHASE_ORDER.indexOf(to);
  
  // Allow moving forward or one step back (e.g. back to Rehab from Listed)
  return toIndex >= fromIndex - 1;
}

/**
 * Marketplace: Accept a vendor's quoted fee and inject it into the deal ledger.
 */
export async function acceptVendorQuote(
  projectId: string,
  request: VendorRequest,
  userUid: string
) {
  if (!request.quotedFee) throw new Error('Cannot accept quote without a fee amount');

  // 1. Update the VendorRequest status (Mocking the persistence service call)
  console.log(`Transitioning VendorRequest ${request.id} to ACCEPTED`);

  // 2. Create the Ledger Entry
  const newFeeItem: CostBasisLineItem = {
    id: `vfee_${Date.now()}`,
    label: `Professional Fee: ${request.vendorUid === 'Lawyer' ? 'Legal Counsel' : 'Appraisal'}`,
    amount: request.quotedFee,
    paid: false,
    notes: `Accepted marketplace quote from vendor: ${request.vendorUid}`
  };

  // 3. Inject into the proper category (Acquisition for Lawyers/Appraisers)
  const deal = await projectsService.getDeal(projectId);
  if (!deal) throw new Error('Deal not found');

  const currentLedger = deal.costBasisLedger || { directAcquisition: [], financing: [], preClosing: [] };
  const updatedLedger = {
    ...currentLedger,
    directAcquisition: [...currentLedger.directAcquisition, newFeeItem]
  };

  await projectsService.updateDeal(projectId, { 
    costBasisLedger: updatedLedger,
    updatedAt: new Date()
  });

  // 4. Record transition for auditing - Safe wrapper
  try {
    if (prisma) {
      await prisma.phaseTransition.create({
        data: {
          linkedProjectId: projectId,
          fromPhase: deal.status as any,
          toPhase: deal.status as any,
          userUid: userUid,
          notes: `Marketplace fee of $${request.quotedFee} accepted and added to ledger.`
        }
      });
    }
  } catch (error) {
    console.warn('[Audit Warning] Prisma vendor fee logging failed.', error);
  }
}
