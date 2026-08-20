import type { RouteResult } from '../../../http/response.js';
import { jsonResponse } from '../../../http/response.js';
import {
  aggregatePortfolioData,
  type ReportPeriod,
} from '../../../lib/reports/aggregation.js';
import type { ProjectTaxDatapoints } from '../../../lib/tax/datapoint-schema.js';
import { MOCK_PORTFOLIO_TAX_PROJECTS } from '../../../lib/reports/fixtures/mock-portfolio-projects.js';

export interface AuthContext {
  uid: string;
}

export interface AuthFailure {
  status: number;
  body: unknown;
}

export type AuthenticateFn = () => Promise<AuthContext | AuthFailure>;

export interface ReportsPortfolioQuery {
  period?: ReportPeriod;
}

export interface ReportsPortfolioDeps {
  authenticate?: AuthenticateFn;
  projects?: ProjectTaxDatapoints[];
}

function isAuthFailure(result: AuthContext | AuthFailure): result is AuthFailure {
  return 'status' in result && 'body' in result && !('uid' in result);
}

/**
 * GET /api/reports/portfolio — migrated from PaperWorking src/app/api/reports/portfolio/route.ts
 */
export async function handleReportsPortfolioGet(
  query: ReportsPortfolioQuery = {},
  deps: ReportsPortfolioDeps = {},
): Promise<RouteResult> {
  try {
    if (deps.authenticate) {
      const auth = await deps.authenticate();
      if (isAuthFailure(auth)) {
        return jsonResponse(auth.status, auth.body);
      }
    }

    const period = query.period ?? 'overall';
    const projects = deps.projects ?? MOCK_PORTFOLIO_TAX_PROJECTS;
    const report = aggregatePortfolioData(projects, period);

    return {
      status: 200,
      body: report,
      headers: {
        'content-type': 'application/json',
        'Cache-Control': 'private, max-age=300, s-maxage=300',
      },
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, {
      error: 'Failed to aggregate portfolio reports',
      details: errMsg,
    });
  }
}
