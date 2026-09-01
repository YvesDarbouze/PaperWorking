import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createReportsGenerateService,
  createReportsReadService,
} from '@paperworking/services';
import {
  createPrismaAuthzStore,
  createPrismaReportsReadRepository,
  createReportPdfExportPort,
} from '@paperworking/database';
import type { PrismaService } from '../prisma/prisma.service.js';

export function buildNestReportsServices(prisma: PrismaService) {
  const client = prisma.client;
  const authz = new CoreAuthorizationService(createPrismaAuthzStore(client));
  const repository = createPrismaReportsReadRepository(client);

  return {
    read: createReportsReadService({ authz, repository }),
    generate: createReportsGenerateService({ authz, pdfExport: createReportPdfExportPort() }),
  };
}

export type NestReportsServices = ReturnType<typeof buildNestReportsServices>;
