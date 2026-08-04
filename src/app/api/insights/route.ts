import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminDb } from '@/lib/firebase/admin';
import { calculateKPIs } from '@/lib/insights/kpiEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || searchParams.get('uid');

    let projects: any[] = [];
    let userPersona: string | undefined = undefined;

    if (userId) {
      // 1. Fetch user to determine persona
      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (userRecord) {
        userPersona = (userRecord as any).agentPersona || undefined;
      }

      // 2. Query Prisma for projects owned by user
      const dbProjects = await prisma.project.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      projects = dbProjects.map((p: any) => ({
        id: p.id,
        title: p.title || p.propertyName || 'Project',
        propertyName: p.title || p.propertyName || 'Project',
        userId: p.userId,
        currentPhase: p.currentPhase,
        dispositionType: p.dispositionType,
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
        syntheticAgent: p.syntheticAgent,
        financials: p.financials || {},
      }));

      // Fallback to Firestore if no projects in Prisma
      if (projects.length === 0) {
        const snap = await adminDb
          .collection('projects')
          .where('userId', '==', userId)
          .get();

        if (!snap.empty) {
          projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }
      }
    }

    // If still no projects found, check if userId matches synthetic agent handles or UIDs in fixture
    if (projects.length === 0) {
      const allProjectsSnap = await adminDb.collection('projects').get();
      if (!allProjectsSnap.empty) {
        projects = allProjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (userId) {
          projects = projects.filter((p) => p.userId === userId || p.listedByAgent === userId);
        }
      }
    }

    const kpiResult = calculateKPIs(projects, userPersona);

    return NextResponse.json({
      success: true,
      persona: kpiResult.persona,
      totalProjects: kpiResult.totalProjects,
      metrics: kpiResult.metrics,
      categories: kpiResult.categories,
    });
  } catch (err: any) {
    console.error('[API /api/insights GET]', err);
    return NextResponse.json(
      { error: 'Failed to calculate insights', message: err.message },
      { status: 500 }
    );
  }
}
