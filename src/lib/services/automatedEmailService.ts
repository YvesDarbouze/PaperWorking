import { CommunicationEngine } from '@/lib/engine/CommunicationEngine';
import type { SendResult } from '@/lib/engine/CommunicationEngine';
import { adminAuth } from '@/lib/firebase/admin';

/**
 * AutomatedEmailService
 *
 * Lifecycle-triggered email dispatch layer.
 * Now delegates all rendering, dispatch, and tracking to the CommunicationEngine.
 *
 * Each method resolves human-readable names from UIDs, then calls
 * CommunicationEngine.sendCannedEmail() with the appropriate template slug.
 */

async function resolveDisplayName(uid: string): Promise<string> {
  try {
    const record = await adminAuth.getUser(uid);
    return record.displayName || record.email || 'A team member';
  } catch {
    return 'A team member';
  }
}

export const automatedEmailService = {
  /**
   * Fires when a project advances to the next lifecycle phase.
   */
  async onPhaseAdvance(
    projectId: string,
    fromPhase: string,
    toPhase: string,
    advancedByUid: string,
  ): Promise<SendResult> {
    const advancedBy = await resolveDisplayName(advancedByUid);

    return CommunicationEngine.sendCannedEmail('phase_advance', 'team', {
      projectId,
      fromPhase,
      toPhase,
      advancedBy,
    });
  },

  /**
   * Fires when an investor pledges capital.
   */
  async onInvestorPledge(
    projectId: string,
    investorName: string,
    pledgeAmount: number,
    totalRaised: number,
    targetAmount: number,
  ): Promise<SendResult> {
    return CommunicationEngine.sendCannedEmail('investor_pledge', 'team', {
      projectId,
      investorName,
      pledgeAmount,
      totalRaised,
      targetAmount,
    });
  },

  /**
   * Fires when a document is uploaded to the vault.
   */
  async onDocumentUpload(
    projectId: string,
    documentName: string,
    category: string,
    uploaderName: string,
  ): Promise<SendResult> {
    return CommunicationEngine.sendCannedEmail('document_upload', 'team', {
      projectId,
      documentName,
      category,
      uploaderName,
    });
  },

  /**
   * Fires when a project is closed (won or lost).
   */
  async onProjectClosed(
    projectId: string,
    outcome: 'closed_won' | 'closed_lost',
    closedByUid: string,
    metrics?: { netProfit?: number; roi?: number; daysHeld?: number },
  ): Promise<SendResult> {
    const closedBy = await resolveDisplayName(closedByUid);

    return CommunicationEngine.sendCannedEmail('project_closed', 'team', {
      projectId,
      outcome,
      closedBy,
      netProfit: metrics?.netProfit,
      roi: metrics?.roi,
      daysHeld: metrics?.daysHeld,
    });
  },
};
