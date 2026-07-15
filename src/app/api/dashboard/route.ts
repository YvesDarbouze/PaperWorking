import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { getDashboardCache, setDashboardCache } from '@/lib/cache/dashboardCache';
import { deriveAllMetrics, deriveAllProjectMetrics } from '@/lib/metrics';
import { parseDate } from '@/lib/metrics/helpers';

export const dynamic = 'force-dynamic';

// ── Pure sparkline builder — exported for unit testing ──────────────────────
export interface SparklineMetric {
  sparkline: number[];
  delta: number;
  changePercent: number;
  insufficientData: boolean;
}

/**
 * Builds a sparkline metric from an array of raw monthly snapshots.
 *
 * @param rawSnapshots  Firestore snapshot documents for the org, already
 *                      filtered to `periodType === 'monthly'`.
 * @param currentValue  The live value to compare the prior period against.
 * @param sumFn         Extracts the per-snapshot value for a given period.
 */
export function buildSparklineMetric(
  rawSnapshots: { period: string; [key: string]: any }[],
  currentValue: number,
  sumFn: (snap: any) => number
): SparklineMetric {
  const byPeriod: Record<string, any[]> = {};
  for (const s of rawSnapshots) {
    if (!byPeriod[s.period]) byPeriod[s.period] = [];
    byPeriod[s.period].push(s);
  }
  const sortedPeriods = Object.keys(byPeriod).sort();

  const sparkline = sortedPeriods.map((period) =>
    Math.round(byPeriod[period].reduce((acc, s) => acc + sumFn(s), 0))
  );

  const insufficientData = sparkline.length < 2;

  const prevValue = insufficientData ? 0 : sparkline[sparkline.length - 2];
  const delta     = insufficientData ? 0 : currentValue - prevValue;
  const changePercent = prevValue > 0 ? (delta / prevValue) * 100 : 0;

  return {
    sparkline,
    delta: Math.round(delta),
    changePercent: Math.round(changePercent * 100) / 100,
    insufficientData,
  };
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    // 2. Identify organizationId
    const url = new URL(request.url);
    let organizationId = url.searchParams.get('organizationId');

    const userSnap = await adminDb.collection('users').doc(uid).get();
    const profile = userSnap.exists ? userSnap.data() : null;

    if (!organizationId && profile) {
      organizationId = profile.organizationId || profile.personalOrganizationId;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organization ID' }, { status: 400 });
    }

    // 3. Verify org membership securely
    const orgSnap = await adminDb.collection('organizations').doc(organizationId).get();
    if (!orgSnap.exists) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const orgData = orgSnap.data();
    const isOwner = orgData?.ownerUid === uid;
    const isTeamMember = orgData?.teamMembers?.some((m: any) => m.id === uid && m.status === 'active');

    if (!isOwner && !isTeamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check scope settings
    const userScope = profile?.membershipScopes?.[organizationId];
    const isScoped = userScope?.isScoped === true;
    const allowedProjectIds = isScoped ? (userScope.scopedProjectIds || userScope.assignedProjectIds || []) : null;

    // 4. Serve from Cache if available (only for unscoped users)
    if (!isScoped) {
      const cached = getDashboardCache(organizationId);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // 5. Query active projects
    const projectsSnap = await adminDb.collection('projects')
      .where('organizationId', '==', organizationId)
      .get();

    const allProjects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
    let activeProjects = allProjects.filter(p => (p.status || '').toLowerCase() !== 'archived');

    if (isScoped && allowedProjectIds) {
      activeProjects = activeProjects.filter(p => allowedProjectIds.includes(p.id));
    }

    // NOI & Cash Flow calculations
    let currentMonthNOI = 0;
    let currentMonthCF = 0;
    const phaseCounts = {
      'Acquisition': 0,
      'Closing': 0,
      'Rehab': 0,
      'Hold / Exit': 0,
    };

    const projectCalculations = await Promise.all(activeProjects.map(async p => {
      const ledgerSnap = await adminDb
        .collection('projects')
        .doc(p.id)
        .collection('ledgerItems')
        .get();

      const ledgerItems = ledgerSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];

      const assetMetrics = deriveAllMetrics(
        p.financials || {},
        undefined,
        p.dispositionType,
        p.currentPhase,
        p.createdAt
      );
      
      const projectMetrics = deriveAllProjectMetrics(p, 0, ledgerItems);

      return {
        project: p,
        assetMetrics,
        projectMetrics,
      };
    }));

    // Accumulate monthly NOI and Cash Flow and track phases
    projectCalculations.forEach(({ project, assetMetrics }) => {
      currentMonthNOI += (assetMetrics.noi || 0) / 12;
      currentMonthCF += assetMetrics.monthlyCashFlow || 0;

      // Track phases
      const phaseNum = project.currentPhase ?? 1;
      if (phaseNum === 1) phaseCounts['Acquisition']++;
      else if (phaseNum === 2) phaseCounts['Closing']++;
      else if (phaseNum === 3) phaseCounts['Rehab']++;
      else if (phaseNum === 4) phaseCounts['Hold / Exit']++;
    });

    // Fetch snapshots for historical trend
    const snapshotsSnap = await adminDb.collection('propertyMetricSnapshots')
      .where('organizationId', '==', organizationId)
      .where('periodType', '==', 'monthly')
      .get();

    const rawSnapshots = snapshotsSnap.docs.map(d => d.data()) as { period: string; [key: string]: any }[];

    const noiMetric = buildSparklineMetric(
      rawSnapshots,
      currentMonthNOI,
      (s) => (s.noi || 0) / 12
    );

    const cfMetric = buildSparklineMetric(
      rawSnapshots,
      currentMonthCF,
      (s) => s.monthlyCashFlow || 0
    );

    // Attention Feed Construction
    const attentionFeed: any[] = [];
    const now = new Date();
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    projectCalculations.forEach(({ project, assetMetrics, projectMetrics }) => {
      // 1. Missing core metrics check
      const isMissingFinancials = 
        !project.financials?.purchasePrice ||
        project.financials.purchasePrice <= 0 ||
        (!project.financials.projectedOpex && !project.financials.projectedRent);

      if (isMissingFinancials) {
        attentionFeed.push({
          id: `missing-fin-${project.id}`,
          projectId: project.id,
          propertyName: project.propertyName,
          type: 'critical_metric',
          message: 'Missing core financial input fields. Under-writing metrics are incomplete.',
          severity: 'warning',
        });
      }

      // 2. Transactions closing within 14 days
      if (project.currentPhase === 2 && project.financials?.estimatedCloseDate) {
        const closeDate = parseDate(project.financials.estimatedCloseDate);
        if (closeDate && closeDate >= now && closeDate <= fourteenDaysFromNow) {
          const daysLeft = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          attentionFeed.push({
            id: `closing-soon-${project.id}`,
            projectId: project.id,
            propertyName: project.propertyName,
            type: 'due_date',
            message: `Closing scheduled to complete in ${daysLeft} days (${closeDate.toLocaleDateString()}).`,
            severity: 'alert',
          });
        }
      }

      // 3. Warning/Alert Tasks
      if (project.actionItems && Array.isArray(project.actionItems)) {
        project.actionItems.forEach((task: any) => {
          if (task.status !== 'Complete' && (task.escalationLevel === 'warning' || task.escalationLevel === 'alert')) {
            attentionFeed.push({
              id: `task-escalation-${project.id}-${task.id}`,
              projectId: project.id,
              propertyName: project.propertyName,
              type: 'task_alert',
              message: `High priority task "${task.label || task.title}" is unresolved (${task.escalationLevel}).`,
              severity: task.escalationLevel,
            });
          }
        });
      }
    });

    // Top Performers: Sort active projects by ROI desc, take top 3
    const topPerformers = projectCalculations
      .map(item => ({
        id: item.project.id,
        propertyName: item.project.propertyName,
        address: item.project.address,
        dispositionType: item.project.dispositionType,
        subStrategy: item.project.subStrategy,
        roi: item.projectMetrics.roi,
        capRate: item.assetMetrics.capRate,
      }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 3);

    // Recent Activity / Audit logs
    let recentActivity: any[] = [];
    try {
      const logsSnap = await adminDb.collection('auditLogs')
        .where('organizationId', '==', organizationId)
        .orderBy('createdAt', 'desc')
        .limit(8)
        .get();

      recentActivity = logsSnap.docs
        .map(d => {
          const log = d.data();
          const targetProjId = log.metadata?.projectId || log.projectId;
          if (isScoped && allowedProjectIds && !allowedProjectIds.includes(targetProjId)) {
            return null;
          }

          const date = parseDate(log.createdAt) || new Date();
          const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
          let timeLabel = 'Just now';
          if (diffMin >= 1440) timeLabel = `${Math.floor(diffMin / 1440)}d ago`;
          else if (diffMin >= 60) timeLabel = `${Math.floor(diffMin / 60)}h ago`;
          else if (diffMin > 0) timeLabel = `${diffMin}m ago`;

          let actionMessage = log.actorName;
          switch (log.action) {
            case 'MEMBER_INVITED':
              actionMessage += ` invited ${log.targetEmail}`;
              break;
            case 'MEMBER_REMOVED':
              actionMessage += ` removed ${log.targetEmail}`;
              break;
            case 'PROJECT_CREATED':
              actionMessage += ` created project "${log.metadata?.projectName || 'Project'}"`;
              break;
            default:
              actionMessage += ` performed ${log.action.toLowerCase().replace(/_/g, ' ')}`;
          }

          return {
            id: d.id,
            type: log.action,
            message: actionMessage,
            timestamp: timeLabel,
          };
        })
        .filter(Boolean);
    } catch (err) {
      console.warn('[Dashboard API] Failed to fetch audit logs (likely index missing):', err);
      // Fallback: simple user events
      recentActivity = [
        { id: 'f1', type: 'info', message: 'Dashboard updated', timestamp: 'Just now' }
      ];
    }

    const payload = {
      noi: {
        current: Math.round(currentMonthNOI),
        delta: noiMetric.delta,
        changePercent: noiMetric.changePercent,
        sparkline: noiMetric.sparkline,
        insufficientData: noiMetric.insufficientData,
      },
      cashFlow: {
        current: Math.round(currentMonthCF),
        delta: cfMetric.delta,
        changePercent: cfMetric.changePercent,
        sparkline: cfMetric.sparkline,
        insufficientData: cfMetric.insufficientData,
      },
      activeProjects: {
        count: activeProjects.length,
        distribution: phaseCounts,
      },
      attentionFeed,
      topPerformers,
      recentActivity,
    };

    // Cache the dynamic result (only for unscoped users)
    if (!isScoped) {
      setDashboardCache(organizationId, payload);
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Dashboard GET] Error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: errMsg },
      { status: 500 }
    );
  }
}
