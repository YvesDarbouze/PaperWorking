import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import prisma from '@/lib/prisma';
import { generateReportPDF } from '@/lib/reports/pdfGenerator';
import { generatePortfolioCSV, generateTransactionCSV } from '@/lib/reports/csvBuilder';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    // 2. Fetch user's subscription profile
    const userSnap = await adminDb.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 });
    }
    const userData = userSnap.data() || {};
    const isPremium = userData.subscriptionStatus === 'active' || userData.subscriptionStatus === 'trialing';
    const investorName = userData.displayName || userData.name || 'Valued Investor';
    const orgId = userData.organizationId || 'org_paperworking_seed';

    // 3. Parse & validate request body
    const body = await req.json();
    const { scope = 'portfolio', projectId, format = 'pdf', type = 'portfolio' } = body;

    // 4. Fetch projects for this organization
    const projectsSnap = await adminDb.collection('projects')
      .where('organizationId', '==', orgId)
      .get();
    
    const projects = projectsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any));

    const projectIds = projects.map(p => p.id);

    // Ensure requested project belongs to the user's organization
    if (scope === 'project' && projectId) {
      if (!projectIds.includes(projectId)) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    const dateStr = new Date().toISOString().split('T')[0];

    // ────────────────────────────────────────────────────────────────────────
    // CSV FORMAT EXPORT
    // ────────────────────────────────────────────────────────────────────────
    if (format === 'csv') {
      if (type === 'portfolio') {
        const csvContent = generatePortfolioCSV(projects, isPremium);
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="paperworking_portfolio_${dateStr}.csv"`,
          }
        });
      } else {
        // Fetch all transactions for this organization's projects (last 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const txList = await prisma.transaction.findMany({
          where: {
            projectId: { in: projectIds },
            date: { gte: ninetyDaysAgo }
          },
          orderBy: { date: 'desc' }
        });

        // Map Firestore project propertyNames onto transaction objects
        const projectsMap = new Map<string, string>();
        projects.forEach(p => {
          projectsMap.set(p.id, p.propertyName || p.name || 'Unnamed Project');
        });

        const txListWithProjects = txList.map(t => ({
          ...t,
          project: {
            propertyName: t.projectId ? projectsMap.get(t.projectId) : ''
          }
        }));

        const csvContent = generateTransactionCSV(txListWithProjects, isPremium);
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="paperworking_transactions_${dateStr}.csv"`,
          }
        });
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // PDF FORMAT REPORT
    // ────────────────────────────────────────────────────────────────────────
    // Fetch last 90 days of transactions for PDF inclusion
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const txList = await prisma.transaction.findMany({
      where: {
        projectId: { in: projectIds },
        date: { gte: ninetyDaysAgo }
      },
      orderBy: { date: 'desc' }
    });

    const projectsMap = new Map<string, string>();
    projects.forEach(p => {
      projectsMap.set(p.id, p.propertyName || p.name || 'Unnamed Project');
    });

    const txListWithProjects = txList.map(t => ({
      ...t,
      project: {
        propertyName: t.projectId ? projectsMap.get(t.projectId) : ''
      }
    }));

    const pdfBuffer = await generateReportPDF(
      scope,
      projects,
      txListWithProjects,
      investorName,
      isPremium,
      projectId
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="paperworking_${scope === 'portfolio' ? 'portfolio' : 'project'}_${dateStr}.pdf"`,
      }
    });

  } catch (err: any) {
    console.error('[Generate Report Route] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
