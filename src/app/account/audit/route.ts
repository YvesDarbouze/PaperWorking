import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    // 1. Fetch user projects
    const projectsSnap = await adminDb
      .collection('projects')
      .where('ownerUid', '==', uid)
      .get();

    const projects = projectsSnap.docs.map(doc => ({
      id: doc.id,
      propertyName: doc.data().propertyName || doc.data().address || 'Unnamed Project',
    }));

    const projectIds = projects.map(p => p.id);

    // 2. Fetch activity logs for all owned projects
    interface ActivityRow {
      projectName: string;
      userId: string;
      fieldPath: string;
      oldValue: string;
      newValue: string;
      source: string;
      timestamp: string;
    }

    const rows: ActivityRow[] = [];

    for (const project of projects) {
      const logsSnap = await adminDb
        .collection('projects')
        .doc(project.id)
        .collection('activityLog')
        .orderBy('timestamp', 'desc')
        .get();

      for (const logDoc of logsSnap.docs) {
        const data = logDoc.data();
        const timestampDate = data.timestamp?.toDate
          ? data.timestamp.toDate()
          : data.timestamp
          ? new Date(data.timestamp)
          : null;

        rows.push({
          projectName: project.propertyName,
          userId: data.userId || 'system',
          fieldPath: data.fieldPath || '',
          oldValue: JSON.stringify(data.oldValue ?? ''),
          newValue: JSON.stringify(data.newValue ?? ''),
          source: data.source || 'manual',
          timestamp: timestampDate ? timestampDate.toISOString() : '',
        });
      }
    }

    // 3. Compile CSV content
    let csv = 'Project,User ID,Field Path,Old Value,New Value,Source,Timestamp\n';
    
    const escapeCSV = (val: string) => {
      const clean = val.replace(/"/g, '""');
      return `"${clean}"`;
    };

    for (const row of rows) {
      csv += `${escapeCSV(row.projectName)},${escapeCSV(row.userId)},${escapeCSV(row.fieldPath)},${escapeCSV(row.oldValue)},${escapeCSV(row.newValue)},${escapeCSV(row.source)},${escapeCSV(row.timestamp)}\n`;
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=PaperWorking_AuditLog_${uid}.csv`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Audit Exporter] Error exporting CSV:', errMsg);
    return NextResponse.json(
      { error: 'Failed to compile audit CSV', details: errMsg },
      { status: 500 }
    );
  }
}
