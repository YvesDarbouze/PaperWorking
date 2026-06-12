import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb, adminAuth, adminStorage } from '@/lib/firebase/admin';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { telemetry } from '@/lib/telemetry';
import { CommunicationEngine } from '@/lib/engine/CommunicationEngine';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' as any });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const jobSnap = await adminDb.collection('deletionJobs').doc(uid).get();
    if (!jobSnap.exists) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: true,
      job: jobSnap.data()
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to retrieve deletion status', details: errMsg },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let uid = '';
  try {
    // 1. Authenticate user
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    uid = auth.uid;

    const jobRef = adminDb.collection('deletionJobs').doc(uid);
    let jobSnap = await jobRef.get();
    let jobData: any = null;

    // 2. Initialize Deletion Job if it doesn't exist
    if (!jobSnap.exists) {
      console.log(`[GDPR Delete] Initializing deletion job for user ${uid}`);
      
      const userDoc = await adminDb.collection('users').doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      const projectsSnap = await adminDb
        .collection('projects')
        .where('ownerUid', '==', uid)
        .get();
      const ownedProjectIds = projectsSnap.docs.map(doc => doc.id);

      const userAuth = await adminAuth.getUser(uid).catch(() => null);
      const userEmail = userAuth?.email || userData?.email || '';
      const displayName = userAuth?.displayName || userData?.displayName || 'User';

      jobData = {
        userId: uid,
        status: 'in_progress',
        step: 'start',
        stripeCustomerId: userData?.stripeCustomerId || null,
        stripeSubscriptionId: userData?.stripeSubscriptionId || null,
        ownedProjectIds,
        userEmail,
        userName: displayName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: null,
      };

      await jobRef.set(jobData);
      jobSnap = await jobRef.get();

      // Emit Telemetry
      try {
        await telemetry.capture({
          distinctId: uid,
          event: 'account_deletion_started',
          properties: {
            userEmail,
            ownedProjectCount: ownedProjectIds.length,
            timestamp: new Date().toISOString(),
          }
        });
      } catch (telemetryErr) {
        console.error('[GDPR Delete] Telemetry start failed:', telemetryErr);
      }
    } else {
      jobData = jobSnap.data();
      if (jobData.status === 'completed') {
        return NextResponse.json({
          success: true,
          message: 'Account has already been fully deleted.',
          step: 'completed'
        });
      }
      
      // Resume job: set status back to in_progress and clear error
      console.log(`[GDPR Delete] Resuming deletion job for user ${uid} from step ${jobData.step}`);
      await jobRef.update({
        status: 'in_progress',
        error: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const { stripeCustomerId, ownedProjectIds, userEmail, userName } = jobData;

    // ── CASCADE STEP 1: Stripe Cancel ──────────────────
    if (jobData.step === 'start') {
      console.log(`[GDPR Delete] Step 1/5: Canceling Stripe billing for user ${uid}`);
      if (stripeCustomerId) {
        try {
          const stripe = getStripe();
          const subs = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: 'active',
          });
          for (const sub of subs.data) {
            await stripe.subscriptions.cancel(sub.id);
            console.log(`[GDPR Delete] Stripe subscription ${sub.id} cancelled`);
          }
        } catch (stripeErr: any) {
          console.error(`[GDPR Delete] Stripe subscription cancel failed (non-fatal):`, stripeErr.message);
        }
      }
      await jobRef.update({
        step: 'stripe_cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      jobData.step = 'stripe_cancelled';
    }

    // ── CASCADE STEP 2: Firestore Workspace Plane ─────────
    if (jobData.step === 'stripe_cancelled') {
      console.log(`[GDPR Delete] Step 2/5: Deleting Firestore data for user ${uid}`);
      
      // Delete solely-owned projects and their subcollections
      for (const projectId of ownedProjectIds) {
        console.log(`[GDPR Delete] Deleting owned project ${projectId}`);
        const projectRef = adminDb.collection('projects').doc(projectId);

        // Delete subcollections in batches
        const subcollections = [
          'ledgerItems', 'activityLog', 'vendorRequests', 'phaseSnapshots',
          'commitments', 'documents', 'financials',
        ];
        for (const sub of subcollections) {
          const snap = await projectRef.collection(sub).get();
          for (const d of snap.docs) {
            await d.ref.delete();
          }
        }

        // Delete project doc
        await projectRef.delete();

        // Delete propertyMetricSnapshots (top-level collection, keyed by projectId)
        const metricsSnap = await adminDb
          .collection('propertyMetricSnapshots')
          .where('projectId', '==', projectId)
          .get();
        for (const d of metricsSnap.docs) {
          await d.ref.delete();
        }

        // Delete projectFiles and projectFolders (top-level collections keyed by projectId)
        const projectFilesSnap = await adminDb
          .collection('projectFiles')
          .where('projectId', '==', projectId)
          .get();
        for (const d of projectFilesSnap.docs) {
          await d.ref.delete();
        }
        const projectFoldersSnap = await adminDb
          .collection('projectFolders')
          .where('projectId', '==', projectId)
          .get();
        for (const d of projectFoldersSnap.docs) {
          await d.ref.delete();
        }
      }

      // Cleanup memberships on shared projects (projects owned by others)
      // Fetch collaborations from Prisma first before Postgres deletion
      let sharedProjectIds: string[] = [];
      try {
        const collaborations = await prisma.projectCollaborator.findMany({
          where: { userId: uid },
          select: { projectId: true }
        });
        sharedProjectIds = collaborations
          .map(c => c.projectId)
          .filter(pid => !ownedProjectIds.includes(pid));
      } catch (prismaErr) {
        console.warn(`[GDPR Delete] Could not fetch shared projects from Prisma (continuing best-effort):`, prismaErr);
      }

      for (const sharedProjectId of sharedProjectIds) {
        console.log(`[GDPR Delete] Cleaning up membership/assignments on shared project ${sharedProjectId}`);
        const pRef = adminDb.collection('projects').doc(sharedProjectId);
        const pSnap = await pRef.get();
        if (pSnap.exists) {
          const pData = pSnap.data();
          const actionItems = pData?.actionItems || [];
          let updatedActionItems = false;
          const newActionItems = actionItems.map((item: any) => {
            if (item.assignee?.toLowerCase() === userEmail.toLowerCase()) {
              updatedActionItems = true;
              return { ...item, assignee: 'Deleted User', needsReassignment: true };
            }
            return item;
          });

          const updates: Record<string, any> = {
            [`members.${uid}`]: admin.firestore.FieldValue.delete()
          };
          if (updatedActionItems) {
            updates.actionItems = newActionItems;
          }
          await pRef.update(updates);
        }
      }

      // Remove from teamMembers array of all organizations
      const orgsSnap = await adminDb.collection('organizations').get();
      for (const orgDoc of orgsSnap.docs) {
        const orgData = orgDoc.data();
        const teamMembers = orgData.teamMembers || [];
        if (teamMembers.some((m: any) => m.id === uid)) {
          const updatedTeam = teamMembers.filter((m: any) => m.id !== uid);
          await orgDoc.ref.update({
            teamMembers: updatedTeam,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // Delete user's inboxItems
      const inboxRecMatches = await adminDb.collection('inboxItems').where('recipientUid', '==', uid).get();
      for (const doc of inboxRecMatches.docs) {
        await doc.ref.delete();
      }
      const inboxSendMatches = await adminDb.collection('inboxItems').where('senderUid', '==', uid).get();
      for (const doc of inboxSendMatches.docs) {
        await doc.ref.delete();
      }

      // Delete user's notifications
      const notifSnap = await adminDb.collection('notifications').where('recipientId', '==', uid).get();
      for (const doc of notifSnap.docs) {
        await doc.ref.delete();
      }

      // Cancel pending teamInvitations sent by this user
      const sentInvitesSnap = await adminDb
        .collection('teamInvitations')
        .where('inviterUid', '==', uid)
        .where('status', '==', 'pending')
        .get();
      for (const doc of sentInvitesSnap.docs) {
        await doc.ref.update({ status: 'cancelled', cancelledAt: admin.firestore.FieldValue.serverTimestamp() });
      }

      // Delete users/{uid}/sessions subcollection
      const sessionsSnap = await adminDb.collection('users').doc(uid).collection('sessions').get();
      for (const doc of sessionsSnap.docs) {
        await doc.ref.delete();
      }

      // Delete user profile document
      await adminDb.collection('users').doc(uid).delete();

      await jobRef.update({
        step: 'firestore_deleted',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      jobData.step = 'firestore_deleted';
    }

    // ── CASCADE STEP 3: Prisma REIL Plane ─────────────────
    if (jobData.step === 'firestore_deleted') {
      console.log(`[GDPR Delete] Step 3/5: Cleaning up Prisma DB for user ${uid}`);

      // 1. Ensure placeholder "deleted-user" AppUser exists
      await prisma.appUser.upsert({
        where: { id: 'deleted-user' },
        update: {},
        create: {
          id: 'deleted-user',
          email: 'deleted-user@paperworking.co',
          name: 'Deleted User',
        }
      });

      // 2. Reassign StatusEvents and FieldAssignments to placeholder
      await prisma.statusEvent.updateMany({
        where: { recordedById: uid },
        data: { recordedById: 'deleted-user' }
      });

      await prisma.fieldAssignment.updateMany({
        where: { assignedToId: uid },
        data: { assignedToId: 'deleted-user' }
      });

      await prisma.fieldAssignment.updateMany({
        where: { assignedById: uid },
        data: { assignedById: 'deleted-user' }
      });

      // 3. Delete ProjectCollaborator collaborations
      await prisma.projectCollaborator.deleteMany({
        where: { userId: uid }
      });

      // 4. Delete solely-owned ReilProjects (will cascade delete properties, comps, snapshosts, terms)
      await prisma.reilProject.deleteMany({
        where: { createdById: uid }
      });

      // 5. Delete AppUser record — deleteMany is idempotent (0 rows on a retry)
      await prisma.appUser.deleteMany({
        where: { id: uid }
      });

      await jobRef.update({
        step: 'prisma_deleted',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      jobData.step = 'prisma_deleted';
    }

    // ── CASCADE STEP 4: Firebase Storage ──────────────────
    if (jobData.step === 'prisma_deleted') {
      console.log(`[GDPR Delete] Step 4/5: Cleaning up Firebase Storage files for user ${uid}`);
      const bucket = adminStorage.bucket();

      // Delete owned projects' files
      for (const projectId of ownedProjectIds) {
        try {
          const [files] = await bucket.getFiles({ prefix: `projects/${projectId}/` });
          for (const file of files) {
            await file.delete();
          }
        } catch (storageErr: any) {
          console.warn(`[GDPR Delete] Storage files delete skipped for project ${projectId}:`, storageErr.message);
        }
      }

      // Delete user-scoped files
      try {
        const [files] = await bucket.getFiles({ prefix: `users/${uid}/` });
        for (const file of files) {
          await file.delete();
        }
      } catch (storageErr: any) {
        console.warn(`[GDPR Delete] Storage files delete skipped for user ${uid}:`, storageErr.message);
      }

      await jobRef.update({
        step: 'storage_deleted',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      jobData.step = 'storage_deleted';
    }

    // ── CASCADE STEP 5: Firebase Auth User ────────────────
    if (jobData.step === 'storage_deleted') {
      console.log(`[GDPR Delete] Step 5/5: Deleting Firebase Auth credentials for user ${uid}`);
      
      // Revoke all refresh tokens immediately — prevents any existing token from
      // being exchanged for a new ID token between now and the final deleteUser call.
      try {
        await adminAuth.revokeRefreshTokens(uid);
      } catch (revokeErr: any) {
        if (revokeErr?.code !== 'auth/user-not-found') {
          console.warn(`[GDPR Delete] revokeRefreshTokens failed (non-fatal):`, revokeErr.message);
        }
      }

      // Delete user from Firebase Auth — ignore auth/user-not-found so a retry
      // doesn't block completion when the Auth record was already removed.
      try {
        await adminAuth.deleteUser(uid);
      } catch (authErr: any) {
        if (authErr?.code !== 'auth/user-not-found') throw authErr;
        console.warn(`[GDPR Delete] Auth user ${uid} already deleted — treating as success`);
      }

      await jobRef.update({
        status: 'completed',
        step: 'completed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Emit Telemetry
      try {
        await telemetry.capture({
          distinctId: uid,
          event: 'account_deletion_completed',
          properties: {
            userEmail,
            timestamp: new Date().toISOString(),
          }
        });
      } catch (telemetryErr) {
        console.error('[GDPR Delete] Telemetry complete failed:', telemetryErr);
      }

      // Send isolated confirmation email
      if (userEmail) {
        try {
          console.log(`[GDPR Delete] Sending confirmation email to ${userEmail}`);
          await CommunicationEngine.sendRawEmail(
            [userEmail],
            'Your PaperWorking account has been deleted',
            `<h1>Account Deleted</h1><p>Hi ${userName || 'there'},</p><p>This email confirms that your PaperWorking account and all associated data have been permanently deleted, as requested.</p><p><br/>Best,<br/>The PaperWorking Team</p>`
          );
        } catch (emailErr: any) {
          console.error('[GDPR Delete] Deletion confirmation email failed:', emailErr.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Account deletion successfully completed.',
      step: 'completed'
    });

  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error(`❌ [GDPR Delete] Failure on user ${uid}:`, errMsg);

    if (uid) {
      try {
        await adminDb.collection('deletionJobs').doc(uid).update({
          status: 'failed',
          error: errMsg,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // Emit failure telemetry
        await telemetry.capture({
          distinctId: uid,
          event: 'account_deletion_failed',
          properties: {
            error: errMsg,
            timestamp: new Date().toISOString(),
          }
        });
      } catch (dbErr) {
        console.error('[GDPR Delete] Failed to record error state in database:', dbErr);
      }
    }

    return NextResponse.json(
      { error: 'Account deletion cascade failed.', details: errMsg },
      { status: 500 }
    );
  }
}
