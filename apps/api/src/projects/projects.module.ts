import { Module } from '@nestjs/common';
import { AuthorizationService as CoreAuthorizationService } from '@paperworking/authz';
import {
  createAuthzStore,
  createProjectsReadRepository,
  createProjectsCommandRepository,
  createProjectKpiReadRepository,
  createProjectDocumentsRepository,
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
      useFactory: () =>
        createProjectsReadService({
          authz: new CoreAuthorizationService(createAuthzStore()),
          repository: createProjectsReadRepository(),
        }),
    },
    {
      provide: ProjectsCommandService,
      useFactory: () =>
        createProjectsCommandService({
          authz: new CoreAuthorizationService(createAuthzStore()),
          repository: createProjectsCommandRepository(),
        }),
    },
    {
      provide: ProjectKpiReadService,
      useFactory: () =>
        createProjectKpiReadService({
          authz: new CoreAuthorizationService(createAuthzStore()),
          repository: createProjectKpiReadRepository(),
        }),
    },
    {
      provide: ProjectDocumentsReadService,
      useFactory: () =>
        createProjectDocumentsReadService({
          authz: new CoreAuthorizationService(createAuthzStore()),
          repository: createProjectDocumentsRepository(),
          storage: firebaseStorageHasCredentials()
            ? createFirebaseFileStorage()
            : createUnavailableFileStorage('Firebase Storage is not configured'),
        }),
    },
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
