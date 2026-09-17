import { NextResponse } from 'next/server';
import {
  handleProjectsLoansGet,
  handleProjectsLoansPost,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import { getSeedProjectById, updateSeedProject } from '@/lib/projects/seed-data';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const auth = await requireDevSessionAuth();

  const result = await handleProjectsLoansGet(projectId, {
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid, email: (auth as any).email ?? null };
    },
    verifyAccess: async () => {
      const p = getSeedProjectById(projectId);
      if (!p) return null;
      return { authorized: true, role: 'Lead Investor', project: p as any };
    },
    listLoans: async () => {
      const p = getSeedProjectById(projectId);
      if (!p) return [];
      const funding = p.funding;
      if (!funding) return [];
      return [
        {
          id: `loan-${projectId}`,
          projectId,
          instrument: funding.loanType || 'Hard Money',
          lenderName: funding.lenderName || 'Apex Commercial Capital',
          amountCents: (funding.loanAmount || 0) * 100,
          interestRate: funding.interestRatePct || 6.875,
          termMonths: (funding.amortizationYears || 30) * 12,
          points: 1.5,
          status: funding.fundingStatus || 'Term Sheet Received',
        },
      ];
    },
  });

  return toNextResponse(result);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const auth = await requireDevSessionAuth();
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const result = await handleProjectsLoansPost(projectId, body, {
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid, email: (auth as any).email ?? null };
    },
    verifyAccess: async () => {
      const p = getSeedProjectById(projectId);
      if (!p) return null;
      return { authorized: true, role: 'Lead Investor', project: p as any };
    },
    replaceLoans: async ({ loans }) => {
      const p = getSeedProjectById(projectId);
      if (p && loans.length > 0) {
        const first = loans[0];
        updateSeedProject(projectId, {
          funding: {
            ...p.funding,
            loanAmount: ((first.amountCents as number) || 0) / 100,
            interestRatePct: (first.interestRate as number) || p.funding?.interestRatePct,
            fundingStatus: (first.status as string) || 'Application-Submitted',
            lenderName: (first.lenderName as string) || p.funding?.lenderName,
          },
        });
      }
      return loans;
    },
  });

  return toNextResponse(result);
}
