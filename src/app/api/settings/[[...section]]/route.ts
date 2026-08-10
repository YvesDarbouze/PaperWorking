import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

interface PaymentMethod {
  id: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ section?: string[] }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const sectionArr = (await params).section || [];
    const section = sectionArr[0];

    // Load user document to get organization ID
    const isE2eTest = request.cookies.get('__e2e_test')?.value === '1' || request.headers.get('x-e2e-test') === '1' || process.env.ENABLE_MOCK_AUTH === 'true';
    let userData: FirebaseFirestore.DocumentData = {};
    if (isE2eTest) {
      const mockRole = request.cookies.get('mock_user_role')?.value || 'Lead Investor';
      const mockPlan = request.cookies.get('mock_user_subscription_plan')?.value || 'Team';
      userData = {
        displayName: 'Test User',
        email: 'testuser@paperworking.com',
        avatar: '',
        role: mockRole,
        timezone: 'America/New_York',
        phone: '',
        companyName: 'Apex Capital Workspace',
        twoFaEnabled: false,
        subscriptionPlan: mockPlan,
        subscriptionStatus: 'active',
        organizationId: 'org_paperworking_seed',
      };
    } else {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      userData = userDoc.exists ? (userDoc.data() ?? {}) : {};
    }
    const orgId = userData?.organizationId || 'org_placeholder';

    if (section === 'profile') {
      return NextResponse.json({
        name: userData?.displayName || 'User',
        email: userData?.email || '',
        avatar: userData?.avatar || '',
        role: userData?.role || 'Lead Investor',
        timezone: userData?.timezone || 'America/New_York',
        phone: userData?.phone || '',
        companyName: userData?.companyName || '',
        twoFaEnabled: !!userData?.twoFaEnabled,
      });
    }

    if (section === 'billing') {
      const plan = userData?.subscriptionPlan || 'None';
      const status = userData?.subscriptionStatus || 'inactive';

      const paymentMethods = userData?.paymentMethods || (plan !== 'None' ? [
        {
          id: 'pm_1',
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2028,
          isDefault: true,
        }
      ] : []);

      const invoices = userData?.invoices || (plan !== 'None' ? [
        {
          id: 'in_1',
          number: 'INV-001',
          date: new Date().toISOString(),
          amount: plan === 'Team' ? '$99.00' : '$59.00',
          status: 'paid',
          pdfUrl: '#',
          hostedUrl: '#',
        }
      ] : []);

      const price = plan === 'Team' ? '$99.00' : plan === 'Individual' ? '$59.00' : plan === 'Vendor Network' ? '$39.00' : '—';
      const nextBillingDate = userData?.nextBillingDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      return NextResponse.json({
        plan,
        price,
        nextBillingDate,
        status,
        subscriptionStatus: status,
        paymentMethods,
        invoices,
        // Billing contact block — editable inline on Settings → Billing.
        // Falls back to the account values when no override has been saved.
        companyName: userData?.companyName || '',
        billingEmail: userData?.billingEmail || userData?.email || '',
        billingAddress: userData?.billingAddress || '',
      });
    }

    if (section === 'team') {
      if (!orgId || orgId === 'org_placeholder') {
        return NextResponse.json({ members: [], invites: [], roles: [] });
      }

      // Fetch all users under the same organization
      const membersSnap = await adminDb
        .collection('users')
        .where('organizationId', '==', orgId)
        .get();

      const members = membersSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          uid: d.uid || doc.id,
          email: d.email || '',
          displayName: d.displayName || 'User',
          role: d.role || 'Contributor',
          internalRole: d.internalRole || 'Deal Lead',
          status: d.status || 'active',
          assignedProjectIds: d.assignedProjectIds || [],
          joinedAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      });

      // Fetch invitations
      const invitesSnap = await adminDb
        .collection('teamInvitations')
        .where('organizationId', '==', orgId)
        .where('status', '==', 'pending')
        .get();

      const invites = invitesSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          email: d.email || '',
          role: d.role || 'Deal Lead',
          status: 'pending',
          invitedAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
      });

      return NextResponse.json({
        members,
        invites,
        roles: ['CEO', 'President', 'CFO', 'COO', 'Admin', 'Deal Lead'],
      });
    }

    if (section === 'workspace') {
      const orgDoc = await adminDb.collection('organizations').doc(orgId).get();
      const orgData = orgDoc.exists ? orgDoc.data() : {};

      return NextResponse.json({
        name: orgData?.name || 'Apex Capital Workspace',
        logo: orgData?.logo || '',
        timezone: orgData?.timezone || 'America/New_York',
        targetCapRate: orgData?.targetCapRate ?? 5.5,
        targetCoc: orgData?.targetCoc ?? 8.0,
        minDscr: orgData?.minDscr ?? 1.25,
        maxPurchasePrice: orgData?.maxPurchasePrice ?? 500000,
      });
    }

    if (section === 'security') {
      const orgDoc = await adminDb.collection('organizations').doc(orgId).get();
      const orgData = orgDoc.exists ? orgDoc.data() : {};

      return NextResponse.json({
        ssoEnabled: orgData?.ssoEnabled ?? false,
        twoFaRequired: orgData?.twoFaRequired ?? false,
        sessionTimeout: orgData?.sessionTimeout ?? '24 hours',
        ipAllowlist: orgData?.ipAllowlist ?? '',
        ssoProvider: orgData?.ssoProvider ?? 'saml',
        samlEntityId: orgData?.samlEntityId ?? '',
        samlSignInUrl: orgData?.samlSignInUrl ?? '',
        samlX509Cert: orgData?.samlX509Cert ?? '',
      });
    }

    if (section === 'data-privacy') {
      const subAction = sectionArr[1];
      if (subAction === 'download-export') {
        const id = request.nextUrl.searchParams.get('id') || 'export';
        const exportContent = JSON.stringify({
          workspaceId: orgId,
          exportedAt: new Date().toISOString(),
          data: {
            properties: [
              { id: '1', address: '123 Sage Accent Way', value: '$450,000' },
              { id: '2', address: '742 Muted Green Blvd', value: '$890,000' }
            ],
            members: [
              { email: 'admin@paperworking.com', role: 'Admin' }
            ]
          }
        }, null, 2);
        
        return new NextResponse(exportContent, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="paperworking_export_${id}.json"`,
          }
        });
      }

      const orgRef = adminDb.collection('organizations').doc(orgId);
      const orgDoc = await orgRef.get();
      const orgData = orgDoc.exists ? orgDoc.data() : {};
      
      let exports = orgData?.exports || [];
      let activeExportJob = orgData?.activeExportJob || null;
      const deletionScheduledAt = orgData?.deletionScheduledAt || null;

      // Simulate async completion of export job
      if (activeExportJob) {
        const elapsed = Date.now() - new Date(activeExportJob.createdAt).getTime();
        if (elapsed > 4000) {
          const newExport = {
            id: activeExportJob.id,
            date: activeExportJob.createdAt,
            downloadUrl: `/api/settings/data-privacy/download-export?id=${activeExportJob.id}`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          };
          exports = [newExport, ...exports];
          activeExportJob = null;
          
          await orgRef.update({
            exports,
            activeExportJob,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else if (elapsed > 2000 && activeExportJob.status === 'Queued') {
          activeExportJob.status = 'Processing';
          await orgRef.update({
            activeExportJob,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      return NextResponse.json({
        exports,
        activeExportJob,
        deletionScheduledAt,
      });
    }

    if (section === 'integrations') {
      const integrationsSnap = await adminDb.collection('organizations').doc(orgId).collection('integrations').get();
      const connectedApps: string[] = [];
      
      if (!integrationsSnap.empty) {
        integrationsSnap.docs.forEach((doc) => {
          const d = doc.data();
          if (d.status === 'connected' || d.connected) {
            connectedApps.push(doc.id);
          }
        });
      } else {
        const driveConn = userData?.googleDriveConnected ?? false;
        const mlsConn = userData?.mlsConnected ?? false;
        const slackConn = userData?.slackConnected ?? false;
        if (driveConn) connectedApps.push('google-drive');
        if (mlsConn) connectedApps.push('mls');
        if (slackConn) connectedApps.push('slack');
      }

      // Dropbox and other defaults
      if (userData?.dropboxConnected) {
        connectedApps.push('dropbox');
      }

      return NextResponse.json({ connectedApps });
    }

    if (section === 'notifications') {
      return NextResponse.json({
        preferences: userData?.notificationPreferences || {
          syndication: { email: true, inApp: true },
          bids: { email: true, inApp: true },
          tasks: { email: true, inApp: true },
          deadlines: { email: true, inApp: true },
          billing: { email: true, inApp: true },
        },
      });
    }

    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ section?: string[] }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const sectionArr = (await params).section || [];
    const section = sectionArr[0];

    const body = await request.json();

    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const orgId = userData?.organizationId || 'org_placeholder';

    if (section === 'profile') {
      const { firstName, lastName, phone, companyName, avatar } = body;
      const displayName = `${firstName} ${lastName}`.trim();
      const updates: Record<string, unknown> = {
        displayName,
        phone,
        companyName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (avatar !== undefined) {
        updates.avatar = avatar;
      }
      await userRef.update(updates);
      return NextResponse.json({
        name: displayName,
        email: userData?.email || '',
        avatar: avatar ?? userData?.avatar ?? '',
        role: userData?.role || 'Lead Investor',
        timezone: userData?.timezone || 'America/New_York',
        phone,
        companyName,
      });
    }

    if (section === 'billing') {
      // Inline edit of the billing contact block on Settings → Billing.
      // Only these three fields are writable here; plan, status, and payment
      // method are Stripe-authoritative and are never written from the client.
      const { companyName, billingEmail, billingAddress } = body;

      const trimmedEmail = typeof billingEmail === 'string' ? billingEmail.trim() : '';
      if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return NextResponse.json(
          { error: 'Enter a valid billing email address.' },
          { status: 400 },
        );
      }

      const updates = {
        companyName: typeof companyName === 'string' ? companyName.trim().slice(0, 200) : '',
        billingEmail: trimmedEmail,
        billingAddress:
          typeof billingAddress === 'string' ? billingAddress.trim().slice(0, 500) : '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await userRef.set(updates, { merge: true });

      return NextResponse.json({
        companyName: updates.companyName,
        billingEmail: updates.billingEmail,
        billingAddress: updates.billingAddress,
      });
    }

    if (section === 'workspace') {
      const { name, logo, timezone, targetCapRate, targetCoc, minDscr, maxPurchasePrice } = body;
      const orgRef = adminDb.collection('organizations').doc(orgId);
      await orgRef.set(
        {
          name: name ? name.slice(0, 100) : '',
          logo: logo ?? '',
          timezone: timezone ?? 'America/New_York',
          targetCapRate,
          targetCoc,
          minDscr,
          maxPurchasePrice,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return NextResponse.json({
        name: name ? name.slice(0, 100) : '',
        logo: logo ?? '',
        timezone: timezone ?? 'America/New_York',
        targetCapRate,
        targetCoc,
        minDscr,
        maxPurchasePrice,
      });
    }

    if (section === 'security') {
      const { 
        ipAllowlist, 
        sessionTimeout, 
        ssoEnabled, 
        twoFaRequired,
        ssoProvider,
        samlEntityId,
        samlSignInUrl,
        samlX509Cert
      } = body;
      const orgRef = adminDb.collection('organizations').doc(orgId);
      await orgRef.set(
        {
          ipAllowlist: ipAllowlist ?? '',
          sessionTimeout: sessionTimeout ?? '24 hours',
          ssoEnabled: ssoEnabled ?? false,
          twoFaRequired: twoFaRequired ?? false,
          ssoProvider: ssoProvider ?? 'saml',
          samlEntityId: samlEntityId ?? '',
          samlSignInUrl: samlSignInUrl ?? '',
          samlX509Cert: samlX509Cert ?? '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return NextResponse.json({
        ssoEnabled: ssoEnabled ?? false,
        twoFaRequired: twoFaRequired ?? false,
        sessionTimeout: sessionTimeout ?? '24 hours',
        ipAllowlist: ipAllowlist ?? '',
        ssoProvider: ssoProvider ?? 'saml',
        samlEntityId: samlEntityId ?? '',
        samlSignInUrl: samlSignInUrl ?? '',
        samlX509Cert: samlX509Cert ?? '',
      });
    }

    if (section === 'notifications') {
      const { preferences } = body;
      await userRef.update({
        notificationPreferences: preferences,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ preferences });
    }

    if (section === 'billing' && sectionArr[1] === 'payment-methods') {
      const { id } = body;
      const currentMethods = userData?.paymentMethods || [];
      const updatedMethods = currentMethods.map((pm: PaymentMethod) => ({
        ...pm,
        isDefault: pm.id === id,
      }));
      await userRef.update({
        paymentMethods: updatedMethods,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, paymentMethods: updatedMethods });
    }

    return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ section?: string[] }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const sectionArr = (await params).section || [];
    const section = sectionArr[0];
    const subAction = sectionArr[1];

    const body = await request.json().catch(() => ({}));

    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const orgId = userData?.organizationId || 'org_placeholder';

    if (section === 'change-plan') {
      const { plan } = body;
      await userRef.update({
        subscriptionPlan: plan,
        subscriptionStatus: plan !== 'None' ? 'active' : 'inactive',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({
        url: `/dashboard/settings/billing?success=true`,
      });
    }

    if (section === 'cancel') {
      await userRef.update({
        subscriptionStatus: 'cancellation_pending',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const updatedUserDoc = await userRef.get();
      const updatedUserData = updatedUserDoc.exists ? updatedUserDoc.data() : {};
      return NextResponse.json({
        plan: updatedUserData?.subscriptionPlan || 'None',
        subscriptionStatus: 'cancellation_pending',
        paymentMethods: updatedUserData?.paymentMethods || [],
        invoices: updatedUserData?.invoices || [],
      });
    }

    if (section === 'team' && subAction === 'invite') {
      const { email, role } = body;
      const inviteRef = adminDb.collection('teamInvitations').doc();
      await inviteRef.set({
        organizationId: orgId,
        email,
        role,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true });
    }

    if (section === 'integrations' && subAction === 'connect') {
      const { id } = body;
      const updates: Record<string, boolean> = {};
      if (id === 'google-drive') updates.googleDriveConnected = true;
      if (id === 'mls') updates.mlsConnected = true;
      if (id === 'slack') updates.slackConnected = true;

      await userRef.update(updates);
      return NextResponse.json({ success: true });
    }

    if (section === 'data-privacy' && subAction === 'export') {
      const orgRef = adminDb.collection('organizations').doc(orgId);
      const activeExportJob = {
        id: `exp_${Date.now()}`,
        status: 'Queued',
        createdAt: new Date().toISOString(),
      };
      
      await orgRef.update({
        activeExportJob,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, activeExportJob });
    }

    if (section === 'data-privacy' && subAction === 'delete-workspace') {
      const { confirmName } = body;
      const orgRef = adminDb.collection('organizations').doc(orgId);
      const orgDoc = await orgRef.get();
      const orgName = orgDoc.exists ? orgDoc.data()?.name : '';

      if (confirmName !== orgName) {
        return NextResponse.json({ error: 'Workspace name confirmation mismatch' }, { status: 400 });
      }

      const deletionScheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      await orgRef.update({
        deletionScheduledAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, deletionScheduledAt });
    }

    if (section === 'billing' && subAction === 'payment-methods') {
      const { card } = body;
      const currentMethods = userData?.paymentMethods || [];
      const newMethod = {
        id: `pm_${Date.now()}`,
        brand: card.brand || 'visa',
        last4: card.last4 || '4242',
        expMonth: card.expMonth || 12,
        expYear: card.expYear || 2028,
        isDefault: currentMethods.length === 0,
      };
      const updatedMethods = [...currentMethods, newMethod];
      await userRef.update({
        paymentMethods: updatedMethods,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, paymentMethods: updatedMethods });
    }

    return NextResponse.json({ error: 'Section/Action not found' }, { status: 404 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ section?: string[] }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const sectionArr = (await params).section || [];
    const section = sectionArr[0];
    const subAction = sectionArr[1];

    const body = await request.json().catch(() => ({}));

    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const orgId = userData?.organizationId || 'org_placeholder';

    if (section === 'team' && subAction === 'remove') {
      const { memberId } = body;
      const memberRef = adminDb.collection('users').doc(memberId);
      const memberDoc = await memberRef.get();
      if (memberDoc.exists) {
        await memberRef.update({
          organizationId: 'org_placeholder',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await adminDb.collection('teamInvitations').doc(memberId).delete();
      }
      return NextResponse.json({ success: true });
    }

    if (section === 'integrations' && subAction === 'disconnect') {
      const { id } = body;
      const updates: Record<string, boolean> = {};
      if (id === 'google-drive') updates.googleDriveConnected = false;
      if (id === 'mls') updates.mlsConnected = false;
      if (id === 'slack') updates.slackConnected = false;

      await userRef.update(updates);
      return NextResponse.json({ success: true });
    }

    if (section === 'data-privacy' && subAction === 'delete-workspace') {
      const orgRef = adminDb.collection('organizations').doc(orgId);
      await orgRef.update({
        deletionScheduledAt: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, deletionScheduledAt: null });
    }

    if (section === 'billing' && subAction === 'payment-methods') {
      const { id } = body;
      const currentMethods = userData?.paymentMethods || [];
      const updatedMethods = currentMethods.filter((pm: PaymentMethod) => pm.id !== id);
      if (updatedMethods.length > 0 && !updatedMethods.some((pm: PaymentMethod) => pm.isDefault)) {
        updatedMethods[0].isDefault = true;
      }
      await userRef.update({
        paymentMethods: updatedMethods,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, paymentMethods: updatedMethods });
    }

    return NextResponse.json({ error: 'Section/Action not found' }, { status: 404 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
