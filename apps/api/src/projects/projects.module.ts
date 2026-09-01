import { Module } from '@nestjs/common';
import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createPrismaAuthzStore,
  createPrismaProjectsReadRepository,
  createPrismaProjectsCommandRepository,
} from '@paperworking/database';
import {
  ProjectsReadService,
  ProjectsCommandService,
  createProjectsReadService,
  createProjectsCommandService,
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
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
