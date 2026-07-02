import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    // 1. Fetch User Profile
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    const profile = { id: userDoc.id, ...userDoc.data() };

    // 2. Fetch Projects owned by the user
    const projectsSnap = await adminDb
      .collection('projects')
      .where('ownerUid', '==', uid)
      .get();

    const projects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const projectIds = projects.map(p => p.id);

    // 3. Fetch Ledger Items & Activity Logs for these projects
    const ledgers: Record<string, any[]> = {};
    const activityLogs: Record<string, any[]> = {};

    for (const projectId of projectIds) {
      // Fetch Ledger
      const ledgerSnap = await adminDb
        .collection('projects')
        .doc(projectId)
        .collection('ledgerItems')
        .get();
      ledgers[projectId] = ledgerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch Activity Log
      const logSnap = await adminDb
        .collection('projects')
        .doc(projectId)
        .collection('activityLog')
        .get();
      activityLogs[projectId] = logSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // 4. Create ZIP
    const zip = new JSZip();
    zip.file('profile.json', JSON.stringify(profile, null, 2));
    zip.file('projects.json', JSON.stringify(projects, null, 2));
    zip.file('ledger_items.json', JSON.stringify(ledgers, null, 2));
    zip.file('activity_logs.json', JSON.stringify(activityLogs, null, 2));

    // 5. Download and package uploaded files
    if (projectIds.length > 0) {
      try {
        const filesSnap = await adminDb
          .collection('projectFiles')
          .where('projectId', 'in', projectIds)
          .get();

        const bucket = adminStorage.bucket();

        for (const doc of filesSnap.docs) {
          const fileData = doc.data();
          const storagePath = fileData.storagePath;
          if (storagePath) {
            try {
              const fileRef = bucket.file(storagePath);
              const [exists] = await fileRef.exists();
              if (exists) {
                const [content] = await fileRef.download();
                const safeName = (fileData.name || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
                zip.file(`files/project_${fileData.projectId}/${safeName}`, content);
              }
            } catch (err: any) {
              console.warn(`[GDPR download] Skipped storage file: ${storagePath}. Error:`, err.message);
            }
          }
        }
      } catch (storageErr: any) {
        console.warn('[GDPR download] Storage fetch failed. Continuing without files:', storageErr.message);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename=PaperWorking_GDPR_Export_${uid}.zip`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GDPR download] Error compiling ZIP:', errMsg);
    return NextResponse.json(
      { error: 'Failed to compile data export bundle', details: errMsg },
      { status: 500 }
    );
  }
}
