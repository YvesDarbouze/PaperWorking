import { createFirestoreAuthzStore } from '../firestore/create-firestore-authz-store.js';
import { createFirestoreProjectsCommandRepository } from '../firestore/create-firestore-projects-command-repository.js';
import { createFirestoreProjectsReadRepository } from '../firestore/create-firestore-projects-read-repository.js';
import { createFirestoreProjectKpiReadRepository } from '../firestore/create-firestore-project-kpi-read-repository.js';
import { createFirestoreProjectDocumentsRepository } from '../firestore/create-firestore-project-documents-repository.js';

export function createAuthzStore() {
  return createFirestoreAuthzStore();
}

export function createProjectsReadRepository() {
  return createFirestoreProjectsReadRepository();
}

export function createProjectsCommandRepository() {
  return createFirestoreProjectsCommandRepository();
}

export function createProjectKpiReadRepository() {
  return createFirestoreProjectKpiReadRepository();
}

export function createProjectDocumentsRepository() {
  return createFirestoreProjectDocumentsRepository();
}
