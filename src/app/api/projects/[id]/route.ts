import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { clearDashboardCache } from '@/lib/cache/dashboardCache';
import { logOrgActivity } from '@/lib/firebase/orgActivityWriter';
import { determineAccessAndRole, authorizeProjectMutation } from '@/lib/firebase-admin/project-guard';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { assembleListingFromProject } from '@/lib/listings/assembler';
import { geocodeAddress } from '@/lib/providers/geocode';
import { NotificationService } from '@/lib/services/notificationService';
import { deriveAllProjectMetrics } from '@/lib/metrics/reiMetrics';
import { onFundPhaseEnter, onHoldPhaseEnter, onExitPhaseEnter } from '@/lib/phases/dataFlow';

const updateFinancialsSchema = z.object({
  loanAmount: z.number().nonnegative({ message: "loanAmount must be non-negative" }).nullish(),
  loanInterestRate: z.number().nonnegative({ message: "loanInterestRate must be non-negative" }).nullish(),
  loanTermYears: z.number().positive({ message: "loanTermYears must be positive" }).nullish(),
  loanOriginationPoints: z.number().nonnegative({ message: "loanOriginationPoints must be non-negative" }).nullish(),
  downPaymentPercent: z.number().nonnegative().max(100).nullish(),
  purchasePrice: z.number().nonnegative().optional(),
  estimatedARV: z.number().nonnegative().optional(),
  arv: z.number().nonnegative().optional(),
  annualDebtService: z.any().refine(val => val === undefined, {
    message: "annualDebtService is read-only and cannot be updated"
  }).optional(),
}).passthrough();

const updateBodySchema = z.object({
  financials: updateFinancialsSchema.optional(),
  status: z.enum(['acquisition', 'fund', 'hold', 'exit']).optional(),
}).passthrough();

/* ═══════════════════════════════════════════════════════════════
   PATCH /api/projects/[id] — Update project fields

   General-purpose project update route. Used by the wizard for
   draft auto-save and by other components for partial updates.

   Auth: Firebase ID Token (Bearer header)
   Body: Partial project fields to merge
   Returns: { success: true, project: updatedProject }
   ═══════════════════════════════════════════════════════════════ */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing project ID' },
        { status: 400 }
      );
    }

    // 2. Parse and validate the update body
    const body = await request.json();
    const validation = updateBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { financials, ...topLevelUpdates } = validation.data;

    const projectRef = adminDb.collection('projects').doc(projectId);

    // 3. Update project within a transaction
    const transactionResult = await adminDb.runTransaction(async (transaction) => {
      const projectSnap = await transaction.get(projectRef);

      if (!projectSnap.exists) {
        return { status: 404, error: 'Project not found' };
      }

      const projectData = projectSnap.data();
      const targetOrgId = projectData?.organizationId;

      if (!targetOrgId) {
        return { status: 400, error: 'Project has no organization ID associated' };
      }

      // Check org membership securely against organization document
      const orgRef = adminDb.collection('organizations').doc(targetOrgId);
      const orgSnap = await transaction.get(orgRef);
      if (!orgSnap.exists) {
        return { status: 404, error: 'Organization not found' };
      }

      const orgData = orgSnap.data();

      // Resolve role and verify access inside transaction
      const access = determineAccessAndRole(projectData, uid, auth.token?.email, orgData);
      if (!access) {
        return { status: 403, error: 'Access denied. You do not have write access to this project.' };
      }

      const currentPhase = projectData.currentPhase || 1;
      const phaseKey = `phase-${currentPhase}` as 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4';
      const authCheck = authorizeProjectMutation(access, phaseKey);
      if (!authCheck.authorized) {
        return { status: authCheck.status || 403, error: authCheck.error || 'Access denied' };
      }

      const teamMember = orgData?.teamMembers?.find((m: any) => m.id === uid && m.status === 'active');

      // Enforce scoped team member project restrictions
      if (teamMember && teamMember.isScoped) {
        const allowed = teamMember.scopedProjectIds ?? teamMember.assignedProjectIds ?? [];
        if (!allowed.includes(projectId)) {
          return { status: 403, error: 'Access denied. You do not have write access to this project.' };
        }
      }

      // Build update payload — deep merge financials
      const existingFinancials = projectData?.financials || {};
      const updatePayload: Record<string, unknown> = {
        ...topLevelUpdates,
        updatedAt: new Date(),
      };

      if (financials) {
        updatePayload.financials = {
          ...existingFinancials,
          ...financials,
        };
      }

      // ── Material Change Detection & Auto-Reopen (DM-23) ──
      const activeListingId = projectData?.activeListingId;
      let listingSnap = null;
      let listingData = null;
      let listingRef = null;

      if (activeListingId) {
        listingRef = adminDb.collection('dealListings').doc(activeListingId);
        listingSnap = await transaction.get(listingRef);
        if (listingSnap.exists) {
          listingData = listingSnap.data();
        }
      }

      let hasMaterialChanges = false;
      const changedFields: string[] = [];

      // 1. Purchase Price
      const oldPrice = projectData?.financials?.purchasePrice;
      const newPrice = financials?.purchasePrice;
      if (newPrice !== undefined && newPrice !== oldPrice) {
        hasMaterialChanges = true;
        changedFields.push(`Purchase Price (from $${((oldPrice || 0) / 100).toLocaleString()} to $${(newPrice / 100).toLocaleString()})`);
      }

      // 2. Rehab Scope (rehabTier / scopeTier)
      const oldRehab = projectData?.rehabTier || projectData?.scopeTier;
      const newRehab = topLevelUpdates.rehabTier || topLevelUpdates.scopeTier;
      if (newRehab !== undefined && newRehab !== oldRehab) {
        hasMaterialChanges = true;
        changedFields.push(`Rehab Scope (from ${oldRehab || 'None'} to ${newRehab})`);
      }

      // 3. Equity terms target (fundingTarget)
      const oldTarget = projectData?.financials?.equityTerms?.funding_target;
      const newTarget = (financials as any)?.equityTerms?.funding_target;
      if (newTarget !== undefined && newTarget !== oldTarget) {
        hasMaterialChanges = true;
        changedFields.push(`Funding Target (from $${((oldTarget || 0) / 100).toLocaleString()} to $${(newTarget / 100).toLocaleString()})`);
      }

      // 4. Control status
      const oldControl = projectData?.controlStatus;
      const newControl = topLevelUpdates.controlStatus;
      if (newControl !== undefined && newControl !== oldControl) {
        hasMaterialChanges = true;
        changedFields.push(`Control Status (from ${oldControl || 'None'} to ${newControl})`);
      }

      let shouldNotify = false;
      let newVersionNumber = 1;

      if (listingData && (listingData.status === 'published' || listingData.status === 'paused')) {
        if (hasMaterialChanges) {
          shouldNotify = true;
          const priorVersionNumber = listingData.version || 1;
          newVersionNumber = priorVersionNumber + 1;

          const priorSnapshot = {
            propertyName: listingData.propertyName || '',
            address: listingData.address || '',
            askingPriceCents: listingData.askingPriceCents || 0,
            rehabTier: projectData.rehabTier || projectData.scopeTier || '',
            fundingTarget: listingData.equityTerms?.fundingTarget || 0,
            controlStatus: projectData.controlStatus || 'none',
          };

          const priorVersion = {
            version: priorVersionNumber,
            publishedAt: listingData.publishedAt || listingData.updatedAt || new Date().toISOString(),
            publishedBy: listingData.publishedBy || listingData.ownerUid,
            snapshot: priorSnapshot,
          };

          const logEntry = {
            from: listingData.status,
            to: 'draft',
            performedBy: uid,
            performedAt: new Date().toISOString(),
            reason: `Auto-reopened to draft due to material changes: ${changedFields.join(', ')}`,
            visibilityBefore: listingData.visibilityMode,
            visibilityAfter: listingData.visibilityMode,
          };

          if (listingRef) {
            transaction.update(listingRef, {
              status: 'draft',
              version: newVersionNumber,
              versions: FieldValue.arrayUnion(priorVersion),
              transitionLog: FieldValue.arrayUnion(logEntry),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      // Cross-phase transition sync (Part 1 of Prompt 14)
      const currentPhaseVal = topLevelUpdates.currentPhase !== undefined ? Number(topLevelUpdates.currentPhase) : projectData.currentPhase;
      if (topLevelUpdates.currentPhase !== undefined && Number(topLevelUpdates.currentPhase) !== projectData.currentPhase) {
        let flowUpdates = {};
        const dummyProj = { ...projectData, financials: { ...existingFinancials, ...financials } } as unknown as any;
        if (currentPhaseVal === 2) {
          flowUpdates = onFundPhaseEnter(dummyProj);
        } else if (currentPhaseVal === 3) {
          flowUpdates = onHoldPhaseEnter(dummyProj);
        } else if (currentPhaseVal === 4) {
          flowUpdates = onExitPhaseEnter(dummyProj);
        }

        // Apply flowUpdates to updatePayload and merge financials
        if (flowUpdates) {
          Object.assign(updatePayload, flowUpdates);
          if ((flowUpdates as any).financials) {
            updatePayload.financials = {
              ...existingFinancials,
              ...financials,
              ...(flowUpdates as any).financials
            };
          }
        }
      }

      // Perform update inside transaction
      transaction.update(projectRef, updatePayload);

      // Clear dashboard cache inside transaction on success
      clearDashboardCache(targetOrgId);

      return {
        success: true,
        orgId: targetOrgId,
        projectName: projectData?.propertyName || projectData?.address || projectId,
        prevStatus: projectData?.status,
        nextStatus: topLevelUpdates.status,
        prevPhase: projectData?.phaseStatus,
        nextPhase: topLevelUpdates.phaseStatus,
        activeListingId,
        shouldNotify,
        changedFields,
        listingOwnerUid: listingData?.ownerUid,
        newVersionNumber,
      };
    });

    if ('error' in transactionResult) {
      return NextResponse.json(
        { error: transactionResult.error },
        { status: transactionResult.status }
      );
    }

    // Emit phase_change activity when status or phaseStatus actually changed
    const {
      orgId,
      projectName,
      prevStatus,
      nextStatus,
      prevPhase,
      nextPhase,
      activeListingId,
      shouldNotify,
      changedFields,
      listingOwnerUid,
      newVersionNumber,
    } = transactionResult;

    const statusChanged = nextStatus && nextStatus !== prevStatus;
    const phaseChanged = nextPhase && nextPhase !== prevPhase;
    const actorName = auth.token?.name || auth.token?.email || 'Unknown';

    if (orgId && (statusChanged || phaseChanged)) {
      const changeLabel = phaseChanged
        ? `moved to ${nextPhase}`
        : `status changed to "${nextStatus}"`;
      logOrgActivity({
        organizationId: orgId,
        type: 'phase_change',
        actorId: uid,
        actorName,
        summary: `${projectName} — ${changeLabel}`,
        targetRef: `projects/${projectId}`,
        projectId,
        projectName,
      });

      if (phaseChanged) {
        try {
          await NotificationService.broadcastProjectNotification(projectId, {
            type: 'PHASE_TRANSITION',
            actor: { uid, name: actorName },
            objectReference: {
              projectId,
              dealAddress: projectName,
              phase: nextPhase,
            },
            deepLinkUrl: `/dashboard/projects/${projectId}`,
          });
        } catch (notifErr: any) {
          console.error('[Projects PATCH] Phase transition notification failed:', notifErr.message);
        }
      }
    }

    // 4. Return updated snapshot after successful transaction
    const updatedSnap = await projectRef.get();
    const updatedProject = { id: updatedSnap.id, ...updatedSnap.data() } as any;

    // Recompute downstream metrics and update listing if active listing exists (DM-23)
    if (activeListingId) {
      try {
        const ownerUid = listingOwnerUid || updatedProject.ownerUid;
        const ownerSnap = await adminDb.collection('users').doc(ownerUid).get();
        const ownerData = ownerSnap.exists ? ownerSnap.data()! : {};

        const freshPayload = assembleListingFromProject(
          updatedProject,
          {
            uid: ownerUid,
            displayName: (ownerData.displayName as string) || 'Unknown',
            bio: ownerData.bio as string | undefined,
            avatarUrl: ownerData.avatarUrl as string | undefined,
          }
        );

        const coords = await geocodeAddress(updatedProject.address as string);

        await adminDb.collection('dealListings').doc(activeListingId).update({
          ...freshPayload,
          latitude: coords?.lat ?? FieldValue.delete(),
          longitude: coords?.lng ?? FieldValue.delete(),
          updatedAt: new Date().toISOString(),
        });
      } catch (listingUpdateErr: any) {
        console.error('[Projects PATCH] Failed to refresh listing snapshot:', listingUpdateErr.message);
      }
    }

    // Broadcast material change notifications to teammates and commitment holders (DM-23)
    if (shouldNotify && activeListingId) {
      try {
        const notificationsSent = new Set<string>();
        const projectData = updatedProject;

        // Collect team member UIDs (excluding editing user)
        if (projectData.members) {
          Object.keys(projectData.members).forEach(memberUid => {
            if (memberUid !== uid) {
              notificationsSent.add(memberUid);
            }
          });
        }
        if (Array.isArray(projectData.projectTeam)) {
          projectData.projectTeam.forEach((tm: any) => {
            if (tm.uid && tm.uid !== uid && tm.status !== 'removed') {
              notificationsSent.add(tm.uid);
            }
          });
        }

        // Collect subscriber UIDs from commitments
        const commitmentsSnap = await adminDb.collection('projects').doc(projectId).collection('commitments').get();
        commitmentsSnap.forEach(doc => {
          const cData = doc.data();
          if (cData.uid && cData.uid !== uid) {
            notificationsSent.add(cData.uid);
          }
        });

        const notificationPromises = Array.from(notificationsSent).map(async (recipientUid) => {
          try {
            await NotificationService.createNotification({
              recipientId: recipientUid,
              type: 'DEAL_MATERIAL_CHANGE',
              actor: { uid, name: actorName },
              objectReference: {
                projectId,
                dealAddress: projectName,
                task: changedFields.join(', '),
              },
              deepLinkUrl: `/deals/${activeListingId}`,
            });
          } catch (notifErr: any) {
            console.error(`[Projects PATCH] Failed to send material change notification to ${recipientUid}:`, notifErr.message);
          }
        });

        await Promise.all(notificationPromises);
      } catch (notifBroadcastErr: any) {
        console.error('[Projects PATCH] Notification collection/broadcast failed:', notifBroadcastErr.message);
      }
    }

    // 5. Keep REIL-plane (Postgres) consistent
    try {
      const { financialsSyncService } = await import('@/lib/services/financialsSyncService');
      await financialsSyncService.syncProjectFinancials(updatedProject);
    } catch (err) {
      console.error('[Projects PATCH] Failed to sync financials to Postgres:', err);
    }

    return NextResponse.json({
      success: true,
      project: updatedProject,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Projects PATCH] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to update project', details: errMsg },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;

    const { id: projectId } = await params;
    if (!projectId) {
      return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
    }

    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = { id: projectSnap.id, project_id: projectSnap.id, ...projectSnap.data() };
    return NextResponse.json({ success: true, project });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Projects GET] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to fetch project', details: errMsg },
      { status: 500 }
    );
  }
}

