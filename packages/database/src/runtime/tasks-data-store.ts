import { createFirestoreTaskAssignmentsRepository } from '../firestore/create-firestore-task-assignments-repository.js';

export function createTaskAssignmentsRepository() {
  return createFirestoreTaskAssignmentsRepository();
}
