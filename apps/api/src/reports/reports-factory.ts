import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createReportsGenerateService,
  createReportsReadService,
} from '@paperworking/services';
import {
  createAuthzStore,
  createProjectKpiReadRepository,
  createReportsReadRepository,
  createReportPdfExportPort,
} from '@paperworking/database';

export function buildNestReportsServices() {
  const authz = new CoreAuthorizationService(createAuthzStore());
  const repository = createReportsReadRepository();

  return {
    read: createReportsReadService({ authz, repository }),
    generate: createReportsGenerateService({
      authz,
      pdfExport: createReportPdfExportPort(),
      reportsRepository: repository,
      kpiRepository: createProjectKpiReadRepository(),
    }),
  };
}

export type NestReportsServices = ReturnType<typeof buildNestReportsServices>;
