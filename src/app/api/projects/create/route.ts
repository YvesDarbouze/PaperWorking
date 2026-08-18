import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import { generateTodosForPhase, calculatePhaseCompletion } from '@/lib/todo-engine';
import { REIPhase, validateAnswer, INITIAL_QUESTION_TREE } from '@/lib/wizard-engine';
import { clearDashboardCache } from '@/lib/cache/dashboardCache';
import { logOrgActivity } from '@/lib/firebase/orgActivityWriter';

const STORAGE_TOTAL_LIMIT_BYTES = 536870912; // 0.5 GB per account/org

const projectCreateSchema = z.object({
  propertyName: z.string().optional(),
  property_address: z.string().min(1, 'Property address is required'),
  phase: z.enum(['acquisition', 'purchase', 'hold', 'exit']).default('acquisition'),
  date_of_sale: z.string().optional().nullable(),
  entity_type: z.string().optional().default('Sole Proprietor'),
  purchase_price: z.number().nullable().optional(),
  rehab_budget: z.number().nullable().optional(),
  exit_strategy: z.string().optional().default('Flip'),
  answers: z.record(z.string(), z.any()).optional().default({}),
  organizationId: z.string().optional(),
  documents: z.array(z.object({
    doc_id: z.string(),
    type: z.string(),
    url: z.string(),
    name: z.string().optional(),
    size_bytes: z.number().optional(),
    generated_at: z.string(),
  })).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const body = await request.json();
    const validation = projectCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const payload = validation.data;
    const phase = payload.phase as REIPhase;
    const answers: Record<string, any> = { ...payload.answers, ...payload };

    // Validate wizard steps if present
    for (const node of INITIAL_QUESTION_TREE) {
      if (answers[node.question_id] !== undefined || answers[node.question_text] !== undefined) {
        const val = answers[node.question_id] ?? answers[node.question_text];
        const res = validateAnswer(node, val);
        if (!res.valid) {
          return NextResponse.json({ error: res.error, question_id: node.question_id }, { status: 400 });
        }
      }
    }

    // Resolve user's organizationId
    let organizationId = payload.organizationId;
    if (!organizationId) {
      const userSnap = await adminDb.collection('users').doc(uid).get();
      const userData = userSnap.data();
      organizationId = userData?.organizationId || userData?.personalOrganizationId || uid;
    }

    // Account role check: Vendor cannot create projects
    const userSnap = await adminDb.collection('users').doc(uid).get();
    const userData = userSnap?.data();
    if (userData?.account_type === 'vendor' || userData?.role === 'vendor') {
      return NextResponse.json(
        { error: 'Vendors are restricted from creating projects.' },
        { status: 403 }
      );
    }

    // Count existing projects for storage quota calculation
    let existingProjectCount = 0;
    try {
      const existingSnap = await adminDb
        .collection('projects')
        .where('organizationId', '==', organizationId)
        .get();
      existingProjectCount = existingSnap.size;
    } catch {
      existingProjectCount = 0;
    }

    const newTotalProjects = existingProjectCount + 1;
    const storageQuotaBytes = Math.floor(STORAGE_TOTAL_LIMIT_BYTES / newTotalProjects);

    // Initial todos and completion calculation
    const todos = generateTodosForPhase(phase, answers);
    const answeredCount = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== null).length;
    const phaseCompletionPct = calculatePhaseCompletion(todos, answeredCount, 6);

    const projectRef = adminDb.collection('projects').doc();
    const now = new Date();

    const projectDoc = {
      project_id: projectRef.id,
      id: projectRef.id,
      user_id: uid,
      ownerUid: uid,
      organizationId,
      account_type: userData?.account_type || 'standard',
      phase,
      currentPhase: phase === 'acquisition' ? 1 : phase === 'purchase' ? 2 : phase === 'hold' ? 3 : 4,
      phaseStatus: `Phase: ${phase.toUpperCase()}`,
      phase_completion_pct: phaseCompletionPct,
      date_of_sale: payload.date_of_sale ? new Date(payload.date_of_sale) : null,
      date_created: now,
      createdAt: now,
      updatedAt: now,
      property_address: payload.property_address,
      propertyName: payload.propertyName || payload.property_address,
      address: payload.property_address,
      purchase_price: payload.purchase_price ?? null,
      rehab_costs: payload.rehab_budget ?? null,
      rehab_budget: payload.rehab_budget ?? null,
      holding_costs: 0,
      exit_sale_price: null,
      marketing_costs: 0,
      entity_type: payload.entity_type,
      exit_strategy: payload.exit_strategy,
      team_assignments: [],
      storage_used_bytes: 0,
      storageQuotaBytes,
      quarterly_tax_data: {},
      year_end_tax_data: {},
      documents: payload.documents || [],
      todos,
      answers,
      status: 'Active',
    };

    await projectRef.set(projectDoc);

    // Clear dashboard cache & emit activity log
    try {
      if (organizationId) {
        clearDashboardCache(organizationId);
        logOrgActivity({
          organizationId,
          type: 'deal_created',
          actorId: uid,
          actorName: auth.token.name || auth.token.email || 'User',
          summary: `Created project "${payload.property_address}"`,
          targetRef: `projects/${projectRef.id}`,
          projectId: projectRef.id,
          projectName: payload.property_address,
        });
      }
    } catch {
      // Non-blocking log/cache errors
    }

    return NextResponse.json(
      {
        success: true,
        projectId: projectRef.id,
        project_id: projectRef.id,
        storageQuotaBytes,
        project: projectDoc,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Projects Create API Error]:', errMsg);
    return NextResponse.json(
      { error: 'Failed to create project', details: errMsg },
      { status: 500 }
    );
  }
}
