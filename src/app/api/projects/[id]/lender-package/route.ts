import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { DEFAULT_CHECKLIST_DEFINITIONS, parseChecklistsDoc } from '@/lib/providers/lenderChecklists';
import { verifyProjectAccessAndRole } from '@/lib/firebase-admin/project-guard';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const { id: projectId } = await params;

    const access = await verifyProjectAccessAndRole(projectId, uid, auth.token.email);
    if (!access) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Enforce LP/Vendor access controls
    if (access.role === 'LP') {
      return NextResponse.json({ error: 'Access denied: LPs cannot view lender package.' }, { status: 403 });
    }
    if (access.role === 'Vendor') {
      const allowedVendorSlots = ['f4HardMoneyLenderVendor', 'f4CdcVendor', 'f4AppraiserVendor', 'f4ClosingAttorneyVendor'];
      if (!allowedVendorSlots.includes(access.partyId || '')) {
        return NextResponse.json({ error: 'Access denied: Vendor is not authorized to view lender package.' }, { status: 403 });
      }
    }

    const project = access.project;
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

    // Fetch custom templates from systemConfig/lenderChecklists
    const configDoc = await adminDb.collection('systemConfig').doc('lenderChecklists').get();
    const checklists = configDoc.exists
      ? parseChecklistsDoc(configDoc.data()!)
      : DEFAULT_CHECKLIST_DEFINITIONS;

    let activeInstruments: string[] = [];
    if (!loansSnap.empty) {
      activeInstruments = Array.from(new Set(loansSnap.docs.map(doc => doc.data().instrument).filter(Boolean)));
    } else if (project.financials?.financingType === 'Financed') {
      activeInstruments = ['Conventional'];
    } else {
      // If project has no debt configured yet, return empty list
      return NextResponse.json({ items: [] });
    }

    // Build the union of customary checklist document names uniquely
    const customaryNamesSet = new Set<string>();
    activeInstruments.forEach((inst) => {
      const list = checklists[inst as keyof typeof checklists] || checklists['Conventional'];
      list.forEach(name => customaryNamesSet.add(name));
    });

    const customaryNames = Array.from(customaryNamesSet);

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

    const access = await verifyProjectAccessAndRole(projectId, uid, auth.token.email);
    if (!access) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Only Lead Investors can add custom checklist items
    if (access.role !== 'Lead Investor') {
      return NextResponse.json({ error: 'Forbidden: only Lead Investors can add custom checklist items' }, { status: 403 });
    }

    const project = access.project;

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
