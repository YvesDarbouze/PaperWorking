import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  buildSampleTaxDatapoints,
  DEFAULT_TAX_PACKAGE_FORMS,
  parseTaxPackageRequest,
  type TaxFormType,
} from '../../../lib/tax/schema.js';

export type GenerateTaxPackageFn = (input: {
  datapoints: Record<string, unknown>;
  taxYear: number;
  forms: string[];
}) => Promise<{
  workflow: Record<string, unknown>;
  documents: Array<{ doc_id: string; formType: string; fileName: string; generatedAt: string }>;
}>;

export interface TaxPackagePostDeps {
  requireAuth?: RequireAuthFn;
  generatePackage?: GenerateTaxPackageFn;
}

/**
 * POST /api/tax/package
 */
export async function handleTaxPackagePost(
  body: { projectId?: unknown; taxYear?: unknown },
  deps: TaxPackagePostDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const { projectId, taxYear } = parseTaxPackageRequest(body);
    const datapoints = buildSampleTaxDatapoints(projectId, taxYear);

    const generated = deps.generatePackage
      ? await deps.generatePackage({
          datapoints,
          taxYear,
          forms: DEFAULT_TAX_PACKAGE_FORMS,
        })
      : {
          workflow: { taxYear, steps: [] },
          documents: DEFAULT_TAX_PACKAGE_FORMS.map((form: TaxFormType, idx: number) => ({
            doc_id: `doc_${idx}`,
            formType: form,
            fileName: `${form}.pdf`,
            generatedAt: new Date().toISOString(),
          })),
        };

    return jsonResponse(200, {
      success: true,
      workflow: generated.workflow,
      documents: generated.documents,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { error: 'Failed to generate tax package', details: message });
  }
}
