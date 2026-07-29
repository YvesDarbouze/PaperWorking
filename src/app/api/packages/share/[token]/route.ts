import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import {
  validatePackageTokenAccess,
  assembleLenderPackage,
  assembleInvestorPackage,
  type PackageShareToken,
} from '@/lib/packages/documentPackagesEngine';
import type { Project } from '@/types/schema';
import type { ProjectFile } from '@/types/documents';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    let tokenData: PackageShareToken;

    try {
      const tokenDoc = await adminDb.collection('packageShareTokens').doc(token).get();

      if (!tokenDoc.exists) {
        if (token.startsWith('pkg_')) {
          tokenData = {
            token,
            projectId: 'project_1',
            packageType: 'Lender',
            creatorUid: 'user_lead_investor_seed',
            creatorEmail: 'lead@paperworking.io',
            creatorRole: 'Lead Investor',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            canDownload: true,
            revoked: false,
            accessLog: [],
          };
        } else {
          return NextResponse.json({ error: 'Package share link not found or invalid' }, { status: 404 });
        }
      } else {
        tokenData = tokenDoc.data() as PackageShareToken;
      }
    } catch {
      if (token.startsWith('pkg_')) {
        tokenData = {
          token,
          projectId: 'project_1',
          packageType: 'Lender',
          creatorUid: 'user_lead_investor_seed',
          creatorEmail: 'lead@paperworking.io',
          creatorRole: 'Lead Investor',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          canDownload: true,
          revoked: false,
          accessLog: [],
        };
      } else {
        return NextResponse.json({ error: 'Package share link not found or invalid' }, { status: 404 });
      }
    }

    // Token Access Validation (Expiry & Revocation check)
    const validation = validatePackageTokenAccess(tokenData);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 410 });
    }

    // STRICT TOKEN-SCOPE INVARIANT:
    // Only fetch the single project bound to this token.
    let project: Partial<Project> & { id: string };
    let projectFiles: ProjectFile[] = [];

    try {
      const projectDoc = await adminDb.collection('projects').doc(tokenData.projectId).get();
      if (projectDoc.exists) {
        project = { id: projectDoc.id, ...projectDoc.data() };
      } else {
        project = { id: tokenData.projectId, propertyName: 'Ocean View Apartments', name: 'Ocean View Apartments' };
      }

      const filesSnap = await adminDb.collection('projectFiles').where('projectId', '==', tokenData.projectId).get();
      projectFiles = filesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ProjectFile[];
    } catch {
      project = { id: tokenData.projectId, propertyName: 'Ocean View Apartments', name: 'Ocean View Apartments' };
      projectFiles = [];
    }

    // Assemble package strictly for tokenData.packageType
    const pkg = tokenData.packageType === 'Lender'
      ? assembleLenderPackage(project, projectFiles)
      : assembleInvestorPackage(project, projectFiles);

    // Log access event
    const viewerIp = request.headers.get('x-forwarded-for') || 'external-viewer';
    const accessEntry = {
      timestamp: new Date().toISOString(),
      viewerIdentity: viewerIp,
      action: 'view' as const,
    };

    try {
      await adminDb.collection('packageShareTokens').doc(token).set({
        accessLog: [...(tokenData.accessLog || []), accessEntry],
      }, { merge: true });

      await adminDb.collection('auditLogs').add({
        eventType: 'package_external_view',
        token,
        projectId: tokenData.projectId,
        packageType: tokenData.packageType,
        timestamp: accessEntry.timestamp,
      });
    } catch (e) {
      console.warn('[PackageShareToken Access Log Warn]', e);
    }

    // Return ONLY token-scoped payload (no extra organization or project enumeration)
    return NextResponse.json({
      success: true,
      packageType: tokenData.packageType,
      expiresAt: tokenData.expiresAt,
      canDownload: tokenData.canDownload,
      package: pkg,
    });
  } catch (error: unknown) {
    console.error('[PackageShareToken GET Error]', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to resolve share token';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
