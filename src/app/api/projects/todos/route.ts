import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { isSubscriptionActive } from '@/lib/stripe/subscription';
import type { UserProfile } from '@/types/user';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, projectId, todos } = body;

    if (!idToken || !projectId || !todos) {
      return NextResponse.json(
        { error: 'Missing required fields: idToken, projectId, todos' },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const dealSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!dealSnap.exists) {
      return NextResponse.json({ error: 'Deal not found.' }, { status: 404 });
    }
    const dealData = dealSnap.data();

    // Fetch user profile
    const userSnap = await adminDb.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }
    const profile = userSnap.data() as UserProfile;

    // Tenant check
    if (dealData?.organizationId !== profile?.organizationId) {
      return NextResponse.json({ error: 'Cross-tenant access denied.' }, { status: 403 });
    }

    const hasActiveSub = isSubscriptionActive(profile);
    const plan = hasActiveSub ? (profile?.subscriptionPlan || 'None') : 'None';
    const isVendor = profile?.role === 'Vendor' || profile?.accountType === 'vendor';
    const isReadOnly = isVendor || plan === 'Vendor Network';

    const currentActionItems = dealData?.actionItems || [];

    // Verify each todo item change against plan and role limitations
    for (const proposedTodo of todos) {
      const currentTodo = currentActionItems.find((t: any) => t.id === proposedTodo.id);

      // 1. Check completed status changes
      const wasCompleted = currentTodo?.completed || false;
      const isCompleted = proposedTodo.completed || false;
      if (wasCompleted !== isCompleted) {
        if (plan === 'None' || isReadOnly) {
          return NextResponse.json(
            { error: 'Your current subscription plan or role does not permit completing action items.' },
            { status: 403 },
          );
        }
      }

      // 2. Check assignee changes
      const currentAssignee = currentTodo?.assignee || '';
      const proposedAssignee = proposedTodo.assignee || '';
      if (currentAssignee !== proposedAssignee) {
        if (plan === 'None' || isReadOnly) {
          return NextResponse.json(
            { error: 'Your current subscription plan or role does not permit assigning tasks.' },
            { status: 403 },
          );
        }

        if (plan === 'Individual') {
          const userEmail = profile?.email || decoded.email || '';
          if (proposedAssignee !== '' && proposedAssignee !== userEmail) {
            return NextResponse.json(
              { error: 'Individual plan users can only assign tasks to themselves.' },
              { status: 403 },
            );
          }
        }

        if (plan === 'Team') {
          const userEmail = profile?.email || decoded.email || '';
          if (proposedAssignee !== '') {
            const projectTeam = dealData?.projectTeam || [];
            const activeTeamEmails = projectTeam
              .filter((m: any) => m.status === 'active')
              .map((m: any) => m.email);

            const allowedEmails = [userEmail, ...activeTeamEmails];
            if (!allowedEmails.includes(proposedAssignee)) {
              return NextResponse.json(
                { error: 'Assignee must be the current user or an active member of the project team.' },
                { status: 403 },
              );
            }
          }
        }
      }
    }

    await adminDb.collection('projects').doc(projectId).update({
      actionItems: todos,
      updatedAt: new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Action Items Update] Error:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update action items.', details: error.message },
      { status: 500 },
    );
  }
}
