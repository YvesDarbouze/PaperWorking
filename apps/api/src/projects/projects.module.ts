import { Module } from '@nestjs/common';
import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createPrismaAuthzStore,
  createPrismaProjectsReadRepository,
  createPrismaProjectsCommandRepository,
  createPrismaProjectKpiReadRepository,
  createPrismaProjectDocumentsRepository,
  createFirebaseFileStorage,
  firebaseStorageHasCredentials,
  createUnavailableFileStorage,
} from '@paperworking/database';
import {
  ProjectsReadService,
  ProjectsCommandService,
  ProjectKpiReadService,
  ProjectDocumentsReadService,
  createProjectsReadService,
  createProjectsCommandService,
  createProjectKpiReadService,
  createProjectDocumentsReadService,
} from '@paperworking/services';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsRepository } from './projects.repository.js';
import { ProjectsService } from './projects.service.js';

@Module({
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectsRepository,
    {
      provide: ProjectsReadService,
      useFactory: (prisma: PrismaService) =>
        createProjectsReadService({
          authz: new CoreAuthorizationService(createPrismaAuthzStore(prisma.client)),
          repository: createPrismaProjectsReadRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
    {
      provide: ProjectsCommandService,
      useFactory: (prisma: PrismaService) =>
        createProjectsCommandService({
          authz: new CoreAuthorizationService(createPrismaAuthzStore(prisma.client)),
          repository: createPrismaProjectsCommandRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
    {
      provide: ProjectKpiReadService,
      useFactory: (prisma: PrismaService) =>
        createProjectKpiReadService({
          authz: new CoreAuthorizationService(createPrismaAuthzStore(prisma.client)),
          repository: createPrismaProjectKpiReadRepository(prisma.client),
        }),
      inject: [PrismaService],
    },
    {
      provide: ProjectDocumentsReadService,
      useFactory: (prisma: PrismaService) =>
        createProjectDocumentsReadService({
          authz: new CoreAuthorizationService(createPrismaAuthzStore(prisma.client)),
          repository: createPrismaProjectDocumentsRepository(prisma.client),
          storage: firebaseStorageHasCredentials()
            ? createFirebaseFileStorage()
            : createUnavailableFileStorage('Firebase Storage is not configured'),
        }),
      inject: [PrismaService],
    },
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
