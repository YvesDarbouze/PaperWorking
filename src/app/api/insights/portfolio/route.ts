import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminDb } from '@/lib/firebase/admin';
import { calculateKPIs } from '@/lib/insights/kpiEngine';

export async function GET() {
  try {
    let dbProjects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });

    let projectRecords: any[] = dbProjects.map((p: any) => ({
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

    if (projectRecords.length === 0) {
      const snap = await adminDb.collection('projects').get();
      projectRecords = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    const kpiResult = calculateKPIs(projectRecords, 'portfolio');

    return NextResponse.json({
      success: true,
      persona: 'portfolio',
      totalProjects: kpiResult.totalProjects,
      metrics: kpiResult.metrics,
      categories: kpiResult.categories,
    });
  } catch (err: any) {
    console.error('[API /api/insights/portfolio GET]', err);
    return NextResponse.json(
      { error: 'Failed to calculate portfolio insights', message: err.message },
      { status: 500 }
    );
  }
}
