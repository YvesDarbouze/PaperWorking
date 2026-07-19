import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

async function verifyProjectMembership(projectId: string, uid: string) {
  const snap = await adminDb.collection('projects').doc(projectId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const isOwner = data.ownerUid === uid;
  const isMember = !!data.members?.[uid] || data.teamMemberIds?.includes(uid);
  const isOrgMember = data.organizationId
    ? await adminDb.collection('organizations').doc(data.organizationId).get().then((o) => {
        if (!o.exists) return false;
        const od = o.data()!;
        return od.ownerUid === uid || od.teamMembers?.some((m: any) => m.id === uid && m.status === 'active');
      })
    : false;
  if (!isOwner && !isMember && !isOrgMember) return null;
  return data;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId } = await params;

    const project = await verifyProjectMembership(projectId, uid);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const packageColl = adminDb.collection('projects').doc(projectId).collection('lenderPackage');
    const snap = await packageColl.orderBy('createdAt', 'asc').get();

    if (!snap.empty) {
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return NextResponse.json({ items });
    }

    // Collection is empty, auto-seed customary items based on financing route
    const loansColl = adminDb.collection('projects').doc(projectId).collection('loans');
    const loansSnap = await loansColl.get();
    
    let instrument = 'Conventional';
    if (!loansSnap.empty) {
      instrument = loansSnap.docs[0].data().instrument || 'Conventional';
    } else if (project.financials?.financingType !== 'Financed') {
      // If project has no debt configured yet, return empty list
      return NextResponse.json({ items: [] });
    }

    const isConventionalOrSba = instrument === 'Conventional' || instrument === 'SBA 504';
    const customaryNames = isConventionalOrSba
      ? [
          '3yr Personal Tax Returns',
          '3yr Business Tax Returns',
          'P&L Statement (Year-to-Date)',
          'Proforma (Financial Projections)',
          'Debt Schedule',
          'Organizational Documents (LLC/Articles)',
          'Project Cost Breakdown',
        ]
      : [
          'Purchase Contract',
          'Renovation Budget (Rehab Schedule)',
          'Proforma / Rent Roll',
          'Organizational Documents (LLC/Articles)',
        ];

    const batch = adminDb.batch();
    const items: any[] = [];

    customaryNames.forEach((name, index) => {
      const docRef = packageColl.doc();
      const item = {
        id: docRef.id,
        projectId,
        name,
        isCustom: false,
        status: 'Pending',
        fileId: null,
        fileName: null,
        fileUrl: null,
        reminderCadence: 'none',
        lastRemindedAt: null,
        createdAt: new Date(Date.now() + index * 1000).toISOString(), // preserve sequence
      };
      batch.set(docRef, item);
      items.push(item);
    });

    await batch.commit();
    return NextResponse.json({ items });
  } catch (err: any) {
    console.error('[Lender Package GET]', err.message);
    return NextResponse.json({ error: 'Failed to fetch lender package checklist' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId } = await params;

    const project = await verifyProjectMembership(projectId, uid);
    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, reminderCadence = 'none' } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
    }

    const packageColl = adminDb.collection('projects').doc(projectId).collection('lenderPackage');
    const docRef = packageColl.doc();
    const newItem = {
      id: docRef.id,
      projectId,
      name: name.trim(),
      isCustom: true,
      status: 'Pending',
      fileId: null,
      fileName: null,
      fileUrl: null,
      reminderCadence,
      lastRemindedAt: null,
      createdAt: new Date().toISOString(),
    };

    await docRef.set(newItem);

    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch (err: any) {
    console.error('[Lender Package POST]', err.message);
    return NextResponse.json({ error: 'Failed to add checklist item' }, { status: 500 });
  }
}
