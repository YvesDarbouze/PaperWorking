import { adminDb } from '@/lib/firebase/admin';
import type { ClosingMilestone } from '@/types/schema';

export const timelineSyncWorker = {
  async sync(projectId: string): Promise<{ success: boolean; error?: string }> {
    const projectRef = adminDb.collection('projects').doc(projectId);
    const snap = await projectRef.get();
    if (!snap.exists) {
      return { success: false, error: 'Project not found' };
    }
    const project = snap.data()!;

    // Load loans subcollection to identify active template
    const loansSnap = await projectRef.collection('loans').get();
    const loans = loansSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Identify active template
    let activeTemplate: 'financed_conventional' | 'cash_hard_money' | 'sba' = 'cash_hard_money';
    if (project.financials?.financingType === 'All Cash') {
      activeTemplate = 'cash_hard_money';
    } else {
      const primaryLoan = loans[0] as any;
      if (primaryLoan) {
        if (primaryLoan.instrument === 'Conventional') {
          activeTemplate = 'financed_conventional';
        } else if (primaryLoan.instrument === 'SBA 504') {
          activeTemplate = 'sba';
        }
      }
    }

    const currentTimeline = (project.closingTimeline || []) as ClosingMilestone[];
    const currentTemplate = project.closingTimelineTemplate;
    const contractDate = project.financials?.psaEffectiveDate;

    // Helper to add days to YYYY-MM-DD string
    const calculateTargetDate = (baseDateStr: string | undefined, offsetDays: number): string => {
      const base = baseDateStr ? new Date(baseDateStr + 'T12:00:00') : new Date();
      const target = new Date(base.getTime());
      target.setDate(target.getDate() + offsetDays);
      return target.toISOString().split('T')[0];
    };

    // Build default milestones
    const buildDefaultMilestones = (templateType: 'financed_conventional' | 'cash_hard_money' | 'sba', baseDateStr?: string): ClosingMilestone[] => {
      if (templateType === 'financed_conventional') {
        return [
          { id: 'm-conv-1', key: 'financing', label: 'Financing Approval', targetOffsetDays: 15, targetDate: calculateTargetDate(baseDateStr, 15), completed: false },
          { id: 'm-conv-2', key: 'title', label: 'Title Clearance', targetOffsetDays: 20, targetDate: calculateTargetDate(baseDateStr, 20), completed: false },
          { id: 'm-conv-3', key: 'appraisal', label: 'Appraisal Completion', targetOffsetDays: 25, targetDate: calculateTargetDate(baseDateStr, 25), completed: false },
          { id: 'm-conv-4', key: 'conditions_cleared', label: 'Financing Conditions Cleared', targetOffsetDays: 30, targetDate: calculateTargetDate(baseDateStr, 30), completed: false },
          { id: 'm-conv-5', key: 'cd_delivered', label: 'Closing Disclosure Delivered', targetOffsetDays: 35, targetDate: calculateTargetDate(baseDateStr, 35), completed: false },
          { id: 'm-conv-6', key: 'closing', label: 'Closing Settlement', targetOffsetDays: 45, targetDate: calculateTargetDate(baseDateStr, 45), completed: false }
        ];
      } else if (templateType === 'sba') {
        return [
          { id: 'm-sba-1', key: 'financing', label: 'Financing Approval', targetOffsetDays: 15, targetDate: calculateTargetDate(baseDateStr, 15), completed: false },
          { id: 'm-sba-2', key: 'appraisal', label: 'Appraisal Completion', targetOffsetDays: 25, targetDate: calculateTargetDate(baseDateStr, 25), completed: false },
          { id: 'm-sba-3', key: 'cdc_sba_approval', label: 'CDC & SBA Approval', targetOffsetDays: 35, targetDate: calculateTargetDate(baseDateStr, 35), completed: false },
          { id: 'm-sba-4', key: 'conditions_cleared', label: 'Financing Conditions Cleared', targetOffsetDays: 40, targetDate: calculateTargetDate(baseDateStr, 40), completed: false },
          { id: 'm-sba-5', key: 'cd_delivered', label: 'Closing Disclosure Delivered', targetOffsetDays: 45, targetDate: calculateTargetDate(baseDateStr, 45), completed: false },
          { id: 'm-sba-6', key: 'closing', label: 'Closing Settlement', targetOffsetDays: 55, targetDate: calculateTargetDate(baseDateStr, 55), completed: false }
        ];
      } else {
        return [
          { id: 'm-cash-1', key: 'title', label: 'Title Clearance', targetOffsetDays: 5, targetDate: calculateTargetDate(baseDateStr, 5), completed: false },
          { id: 'm-cash-2', key: 'financing_funding_approval', label: 'Funding Approval', targetOffsetDays: 8, targetDate: calculateTargetDate(baseDateStr, 8), completed: false },
          { id: 'm-cash-3', key: 'closing', label: 'Closing Settlement', targetOffsetDays: 12, targetDate: calculateTargetDate(baseDateStr, 12), completed: false }
        ];
      }
    };

    // Derive actual dates based on project state
    const deriveActualDates = (currentMilestones: ClosingMilestone[]): ClosingMilestone[] => {
      const titleCleared = project.closingRoom?.chainOfTitleStatus === 'verified' || project.closingRoom?.titleWorkflow?.status === 'cleared';
      const loanStatus = project.loanStatus || '';
      const appraisalReceived = loanStatus === 'Appraisal-Received';
      const financingApproved = loanStatus === 'Pre-Approved' || loanStatus === 'Conditions-Issued' || loanStatus === 'Conditions-Cleared' || loanStatus === 'Clear-To-Close';
      const conditionsCleared = loanStatus === 'Conditions-Cleared' || loanStatus === 'Clear-To-Close';
      const fundingApproved = loanStatus === 'Clear-To-Close';
      const cdDelivered = !!project.closingRoom?.closingDisclosureUrl || project.closingChecklist?.find((i: any) => i.type === 'Closing Disclosure')?.completed === true;
      const closed = project.isClearToClose === true || (project.currentPhase !== undefined && project.currentPhase >= 3);

      const todayStr = new Date().toISOString().split('T')[0];

      return currentMilestones.map(m => {
        let actualDate = m.actualDate;
        let completed = m.completed;

        if (m.key === 'title' && titleCleared && !m.completed) {
          actualDate = todayStr;
          completed = true;
        }
        if (m.key === 'appraisal' && appraisalReceived && !m.completed) {
          actualDate = todayStr;
          completed = true;
        }
        if (m.key === 'financing' && financingApproved && !m.completed) {
          actualDate = todayStr;
          completed = true;
        }
        if (m.key === 'conditions_cleared' && conditionsCleared && !m.completed) {
          actualDate = todayStr;
          completed = true;
        }
        if (m.key === 'financing_funding_approval' && fundingApproved && !m.completed) {
          actualDate = todayStr;
          completed = true;
        }
        if (m.key === 'cd_delivered' && cdDelivered && !m.completed) {
          actualDate = todayStr;
          completed = true;
        }
        if (m.key === 'closing' && closed && !m.completed) {
          actualDate = todayStr;
          completed = true;
        }

        const slippage = !completed && m.targetDate < todayStr;

        return {
          ...m,
          actualDate: actualDate ?? null,
          completed,
          slippage
        };
      });
    };

    let milestones = currentTimeline;
    const needsInit = currentTimeline.length === 0 || currentTemplate !== activeTemplate;

    if (needsInit) {
      const defaults = buildDefaultMilestones(activeTemplate, contractDate);
      milestones = deriveActualDates(defaults);
    } else {
      milestones = deriveActualDates(currentTimeline);
    }

    const hasDiff = needsInit || JSON.stringify(milestones) !== JSON.stringify(currentTimeline);

    if (hasDiff) {
      await projectRef.update({
        closingTimeline: milestones,
        closingTimelineTemplate: activeTemplate,
        updatedAt: new Date(),
      });
      console.log(`[TimelineSyncWorker] Updated timeline milestones for project ${projectId}`);

      // Check for new slippage transitions
      const newSlippages = milestones.filter(m => {
        const oldMil = currentTimeline.find(cm => cm.id === m.id);
        return m.slippage && (!oldMil || !oldMil.slippage);
      });

      if (newSlippages.length > 0) {
        const { NotificationService } = require('./notificationService');
        for (const m of newSlippages) {
          try {
            await NotificationService.createNotification({
              recipientId: project.ownerUid || 'unknown',
              type: 'SLIPPAGE_DETECTED',
              actor: {
                uid: 'system',
                name: 'System',
                role: 'System Worker'
              },
              objectReference: {
                projectId,
                dealAddress: project.propertyName || project.address?.street || 'the project',
                task: m.label
              },
              deepLinkUrl: `/dashboard/projects/${projectId}/phase-2`
            });
            console.log(`[TimelineSyncWorker] Sent slippage notification for milestone "${m.label}" to user ${project.ownerUid}`);
          } catch (err) {
            console.error(`[TimelineSyncWorker] Failed to send slippage notification:`, err);
          }
        }
      }
    }

    return { success: true };
  }
};
